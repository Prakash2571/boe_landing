#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

verify_marketing_site() {
    heading "marketing site"

    local apex
    apex="$(http_code "$BOE_APEX/")"
    [[ "$apex" == "200" ]] && pass "apex serves 200" || fail "apex answered $apex"

    local www_code www_target
    www_code="$(http_code "$BOE_WWW/")"
    www_target="$(http_redirect "$BOE_WWW/")"
    if [[ "$www_code" == "301" && "$www_target" == "$BOE_APEX/" ]]; then
        pass "www redirects to the apex"
    else
        fail "www answered $www_code -> ${www_target:-<none>}"
    fi

    local deep
    deep="$(http_redirect "$BOE_WWW/about")"
    [[ "$deep" == "$BOE_APEX/about" ]] \
        && pass "the www redirect preserves the request path" \
        || fail "www/about redirected to ${deep:-<none>}"
}

verify_signup_route() {
    heading "signup ingress"

    local code
    code="$(http_code -X POST -H 'Content-Type: application/json' --data '{}' "$BOE_APEX/api/newuser")"
    if [[ "$code" == "400" || "$code" == "422" || "$code" == "429" ]]; then
        pass "/api/newuser rejects an empty body ($code)"
    else
        warn "/api/newuser answered $code"
    fi

    local blocked
    blocked="$(http_code "$BOE_APEX/api/anything-else")"
    [[ "$blocked" == "404" ]] \
        && pass "no other /api/ path is exposed" \
        || fail "/api/anything-else answered $blocked"
}

verify_payment_callback() {
    heading "PhonePe callback ingress"

    for host in "$BOE_WWW" "$BOE_APEX"; do
        local code
        code="$(http_code -X POST -H 'Content-Type: application/json' --data '{}' \
            "$host/api/v1/provider-events/phonepe/payment")"
        if [[ "$code" == "401" ]]; then
            pass "${host#https://} rejects an unsigned callback (401)"
        elif [[ "$code" == "404" || "$code" == "301" || "$code" == "302" ]]; then
            fail "${host#https://} answered $code — the proxy to the backend is not in place"
        else
            warn "${host#https://} answered $code"
        fi
    done

    local subscription
    subscription="$(http_code -X POST -H 'Content-Type: application/json' --data '{}' \
        "$BOE_WWW/api/v1/provider-events/phonepe/subscription")"
    [[ "$subscription" == "401" ]] \
        && pass "the subscription callback path is reachable too" \
        || warn "subscription path answered $subscription"

    for path in /api/v1/client/orders /api/v1/auth/client/web/csrf; do
        local leaked
        leaked="$(http_code -X POST "$BOE_APEX$path")"
        [[ "$leaked" == "404" ]] \
            && pass "$path is not exposed on the approved domain" \
            || fail "$path answered $leaked — the app API is reachable here"
    done
}

verify_payment_return() {
    heading "payment return"

    for target in dev app; do
        local code location
        code="$(http_code "$BOE_APEX/pay/return/$target")"
        location="$(http_redirect "$BOE_APEX/pay/return/$target")"
        if [[ "$code" == "302" && "$location" == *"beonedge.in/dashboard" ]]; then
            pass "/pay/return/$target redirects into the app"
        else
            fail "/pay/return/$target answered $code -> ${location:-<none>}"
        fi
    done

    local unknown
    unknown="$(http_code "$BOE_APEX/pay/return/evil")"
    [[ "$unknown" == "404" ]] \
        && pass "an unknown return target 404s instead of redirecting" \
        || fail "/pay/return/evil answered $unknown"

    local hostile
    hostile="$(http_redirect "$BOE_APEX/pay/return/dev?to=https://evil.test")"
    local hostile_host
    hostile_host="$(printf '%s' "$hostile" | awk -F/ '{print $3}')"
    if [[ "$hostile_host" == "dev-app.beonedge.in" ]]; then
        pass "a query parameter cannot move the return destination"
    else
        fail "return redirected to host ${hostile_host:-<none>} (${hostile:-<none>})"
    fi
}

verify_pay_start() {
    heading "signed provider hand-off"

    local secret
    secret="$(remote "awk -F= '/^PAY_REDIRECT_SECRET=/{print \$2}' '$BOE_REMOTE_DIR/.env'" 2>/dev/null | tr -d ' \r')"
    if [[ -z "$secret" ]]; then
        warn "PAY_REDIRECT_SECRET is not set on the VPS; skipping signed-link checks"
        return
    fi

    local target encoded expiry signature
    target='https://mercury-t2.phonepe.com/transact/pgv3?token=probe/a+b&routingKey=W'
    encoded="$(printf '%s' "$target" | basenc --base64url -w0 | tr -d '=')"
    expiry="$(( ($(date +%s) + 600) * 1000 ))"
    signature="$(printf '%s\n%s' "$encoded" "$expiry" \
        | openssl dgst -sha256 -hmac "$secret" -hex | awk '{print $2}')"

    local location
    location="$(http_redirect "$BOE_APEX/pay/go?u=$encoded&e=$expiry&s=$signature")"
    [[ "$location" == "$target" ]] \
        && pass "a valid signed link reaches the provider with its query intact" \
        || fail "signed link redirected to ${location:-<none>}"

    local evil evil_signature
    evil="$(printf '%s' 'https://evil.test/steal' | basenc --base64url -w0 | tr -d '=')"
    local tampered
    tampered="$(http_code "$BOE_APEX/pay/go?u=$evil&e=$expiry&s=$signature")"
    [[ "$tampered" == "400" ]] \
        && pass "a swapped target is refused" \
        || fail "swapped target answered $tampered"

    evil_signature="$(printf '%s\n%s' "$evil" "$expiry" \
        | openssl dgst -sha256 -hmac "$secret" -hex | awk '{print $2}')"
    local forged
    forged="$(http_code "$BOE_APEX/pay/go?u=$evil&e=$expiry&s=$evil_signature")"
    [[ "$forged" == "400" ]] \
        && pass "a correctly signed non-provider host is still refused" \
        || fail "signed foreign host answered $forged — this is an open redirect"

    local unsigned
    unsigned="$(http_code "$BOE_APEX/pay/go?u=$encoded&e=$expiry")"
    [[ "$unsigned" == "400" ]] && pass "an unsigned link is refused" || fail "unsigned answered $unsigned"

    local stale stale_signature
    stale="$(( ($(date +%s) - 60) * 1000 ))"
    stale_signature="$(printf '%s\n%s' "$encoded" "$stale" \
        | openssl dgst -sha256 -hmac "$secret" -hex | awk '{print $2}')"
    local expired
    expired="$(http_code "$BOE_APEX/pay/go?u=$encoded&e=$stale&s=$stale_signature")"
    [[ "$expired" == "410" ]] && pass "an expired link is refused" || fail "expired answered $expired"
}

verify_container() {
    heading "container"

    remote_reachable || { warn "ssh unreachable; skipping container checks"; return; }

    local status
    status="$(container_status)"
    [[ "$status" == "running/healthy" ]] \
        && pass "$BOE_CONTAINER is running and healthy" \
        || fail "$BOE_CONTAINER is $status"

    local local_head remote_head
    local_head="$(git_local_head)"
    remote_head="$(git_remote_head)"
    if [[ "$local_head" == "$remote_head" ]]; then
        pass "VPS checkout matches local HEAD ($local_head)"
    else
        warn "local $local_head, VPS ${remote_head:-unknown}"
    fi

    local secret_len
    secret_len="$(remote "docker exec '$BOE_CONTAINER' sh -c 'printf %s \"\${#PAY_REDIRECT_SECRET}\"'" 2>/dev/null)"
    if [[ "${secret_len:-0}" -ge 32 ]]; then
        pass "PAY_REDIRECT_SECRET reaches the process (length $secret_len)"
    else
        fail "PAY_REDIRECT_SECRET is missing or too short in the container (length ${secret_len:-0})"
    fi
}

run_verify() {
    verify_marketing_site
    verify_signup_route
    verify_payment_callback
    verify_payment_return
    verify_pay_start
    verify_container
    summary
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_verify
fi
