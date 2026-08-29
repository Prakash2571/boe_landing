#!/usr/bin/env bash

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SELF_DIR/lib.sh"
source "$SELF_DIR/verify.sh"

usage() {
    cat <<'USAGE'
boe_landing release manager

  release_manager/deploy.sh [command] [options]

commands
  status              show local, VPS and container state
  gates               typecheck, lint, unit tests and a production build, locally
  push                push the current branch to the git remote
  pull                fast-forward the VPS checkout
  build               build the container image on the VPS
  restart             recreate the container on the VPS and wait for health
  verify              probe the deployed site over the network
  deploy              gates, push, pull, build, restart, verify
  secret              generate a shared signing secret and show where it goes
  logs                tail the container log on the VPS
  menu                interactive menu (default when run with no command)

options
  --yes               do not prompt; assume yes
  --skip-gates        deploy without running the local gates first
  --service NAME      compose service to act on (default: landing)
  --branch NAME       git branch to push and pull (default: dev/tamagami-hi)
  --help              this text

environment
  BOE_SSH_ALIAS       ssh host (default: beonedge)
  BOE_REMOTE_DIR      VPS checkout (default: /srv/dev_stack/BOE_LANDING/repo)

The payment service is behind a compose profile and is never started by this
script unless --service payments is passed explicitly.
USAGE
}

cmd_status() {
    heading "local"
    info "repo    $REPO_ROOT"
    info "branch  $(git -C "$REPO_ROOT" branch --show-current)"
    info "HEAD    $(git_local_head) $(git -C "$REPO_ROOT" log -1 --format='%s' | cut -c1-58)"
    if git_local_dirty; then
        warn "working tree has uncommitted changes"
        git -C "$REPO_ROOT" status --short | sed 's/^/      /'
    else
        pass "working tree is clean"
    fi

    local ahead
    ahead="$(git -C "$REPO_ROOT" log --oneline "@{u}..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
    if [[ "$ahead" == "0" ]]; then
        pass "nothing unpushed"
    else
        warn "$ahead commit(s) not pushed to $BOE_REMOTE_NAME/$BOE_BRANCH"
    fi

    heading "vps"
    if ! remote_reachable; then
        fail "cannot reach $BOE_SSH_ALIAS"
        return
    fi
    pass "ssh to $BOE_SSH_ALIAS works"
    info "dir     $BOE_REMOTE_DIR"
    info "HEAD    $(git_remote_head)"

    local dirty
    dirty="$(remote "cd '$BOE_REMOTE_DIR' && git status --porcelain | head -5")"
    [[ -z "$dirty" ]] && pass "VPS checkout is clean" \
        || { warn "VPS has local changes (untracked deploy overrides are expected)"; printf '%s\n' "$dirty" | sed 's/^/      /'; }

    heading "container"
    info "$BOE_CONTAINER  $(container_status)"
    remote "cd '$BOE_REMOTE_DIR' && docker compose config --services" 2>/dev/null \
        | sed 's/^/      service: /'
}

cmd_gates() {
    heading "local gates"
    cd "$REPO_ROOT" || die "cannot enter $REPO_ROOT"

    step "typecheck"
    npx tsc --noEmit -p tsconfig.json >/dev/null 2>&1 \
        && pass "tsc clean" || { npx tsc --noEmit -p tsconfig.json; fail "tsc failed"; return 1; }

    step "lint"
    if npx next lint >/dev/null 2>&1; then
        pass "next lint clean"
    else
        warn "next lint reported findings"
    fi

    step "unit tests"
    if npx vitest run >/dev/null 2>&1; then
        pass "vitest passed"
    else
        npx vitest run
        fail "vitest failed"
        return 1
    fi

    step "production build"
    if npx next build >/dev/null 2>&1; then
        pass "next build succeeded"
    else
        npx next build
        fail "next build failed"
        return 1
    fi

    if [[ -d "$REPO_ROOT/payment-service" ]]; then
        step "payment service"
        ( cd "$REPO_ROOT/payment-service" \
            && npx tsc -p tsconfig.json --noEmit >/dev/null 2>&1 \
            && npx vitest run >/dev/null 2>&1 ) \
            && pass "payment-service typecheck and tests passed" \
            || warn "payment-service gates did not pass (it is not deployed by default)"
    fi
}

cmd_push() {
    heading "push"
    cd "$REPO_ROOT" || die "cannot enter $REPO_ROOT"

    if git_local_dirty; then
        warn "working tree is dirty; commit before pushing"
        git status --short | sed 's/^/      /'
        confirm "push anyway (dirty files will not be included)?" || return 1
    fi

    local ahead
    ahead="$(git log --oneline "@{u}..HEAD" 2>/dev/null | wc -l | tr -d ' ')"
    if [[ "$ahead" == "0" ]]; then
        pass "already up to date with $BOE_REMOTE_NAME/$BOE_BRANCH"
        return 0
    fi
    git log --oneline "@{u}..HEAD" | sed 's/^/      /'
    confirm "push $ahead commit(s) to $BOE_REMOTE_NAME/$BOE_BRANCH?" || return 1
    git push "$BOE_REMOTE_NAME" "$BOE_BRANCH" 2>&1 | sed 's/^/      /'
    pass "pushed"
}

cmd_pull() {
    heading "pull on the vps"
    require_remote
    local before after
    before="$(git_remote_head)"
    remote "cd '$BOE_REMOTE_DIR' && git pull --ff-only '$BOE_REMOTE_NAME' '$BOE_BRANCH' 2>&1 | tail -6" \
        | sed 's/^/      /'
    after="$(git_remote_head)"
    if [[ "$before" == "$after" ]]; then
        info "already at $after"
    else
        pass "$before -> $after"
    fi
}

cmd_build() {
    heading "build on the vps"
    require_remote
    info "service: $BOE_SERVICE"
    remote "cd '$BOE_REMOTE_DIR' && docker compose build '$BOE_SERVICE' 2>&1 | tail -8" | sed 's/^/      /'
    pass "image built"
}

cmd_restart() {
    heading "recreate on the vps"
    require_remote
    confirm "recreate $BOE_CONTAINER? the site is briefly unavailable" || return 1
    remote "cd '$BOE_REMOTE_DIR' && docker compose up -d '$BOE_SERVICE' 2>&1 | tail -6" | sed 's/^/      /'

    step "waiting for health"
    local status
    for _ in $(seq 1 30); do
        status="$(container_status)"
        printf '      %s\n' "$status"
        [[ "$status" == "running/healthy" ]] && break
        sleep 4
    done
    [[ "$status" == "running/healthy" ]] \
        && pass "$BOE_CONTAINER is healthy" \
        || fail "$BOE_CONTAINER is $status"
}

cmd_logs() {
    heading "logs"
    require_remote
    remote "docker logs --tail 60 '$BOE_CONTAINER' 2>&1" | sed 's/^/      /'
}

cmd_secret() {
    heading "shared signing secret"
    local secret
    secret="$(openssl rand -hex 32)"
    printf '\n  %s\n\n' "$secret"
    info "landing  $BOE_REMOTE_DIR/.env     PAY_REDIRECT_SECRET=<above>"
    info "app      /srv/dev_stack/BOE_APP/dev_release/.env   PAYMENT_START_SECRET=<above>"
    warn "both sides must hold the same value; /pay/go refuses every request without it"
}

cmd_deploy() {
    if [[ "${BOE_SKIP_GATES:-false}" != true ]]; then
        cmd_gates || die "local gates failed; fix them or pass --skip-gates"
    else
        warn "skipping local gates"
    fi
    cmd_push || die "push aborted"
    cmd_pull
    cmd_build
    cmd_restart
    run_verify
}

cmd_menu() {
    while true; do
        printf '\n%s┌─ boe_landing release manager ─────────────────┐%s\n' "$C_BOLD$C_BLUE" "$C_RESET"
        printf '  local %s   vps %s   %s\n' \
            "$(git_local_head)" "$(git_remote_head 2>/dev/null || echo '?')" "$(container_status)"
        printf '%s\n' "  ---------------------------------------------"
        printf '  1  status\n'
        printf '  2  gates          (typecheck, lint, test, build)\n'
        printf '  3  push\n'
        printf '  4  pull on vps\n'
        printf '  5  build image on vps\n'
        printf '  6  recreate container\n'
        printf '  7  verify deployed site\n'
        printf '  8  %sfull deploy%s   (2 through 7)\n' "$C_BOLD" "$C_RESET"
        printf '  9  logs\n'
        printf '  s  generate shared secret\n'
        printf '  q  quit\n'
        local choice
        read -r -p "  ${C_BOLD}choice${C_RESET} " choice
        case "$choice" in
            1) cmd_status ;;
            2) cmd_gates ;;
            3) cmd_push ;;
            4) cmd_pull ;;
            5) cmd_build ;;
            6) cmd_restart ;;
            7) run_verify ;;
            8) cmd_deploy ;;
            9) cmd_logs ;;
            s|S) cmd_secret ;;
            q|Q) return 0 ;;
            *) warn "unknown choice" ;;
        esac
    done
}

COMMAND=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        status|gates|push|pull|build|restart|verify|deploy|secret|logs|menu) COMMAND="$1"; shift ;;
        --yes|-y) BOE_ASSUME_YES=true; shift ;;
        --skip-gates) BOE_SKIP_GATES=true; shift ;;
        --service) BOE_SERVICE="${2:?--service needs a value}"; shift 2 ;;
        --branch) BOE_BRANCH="${2:?--branch needs a value}"; shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) die "unknown argument: $1 (try --help)" ;;
    esac
done

case "${COMMAND:-menu}" in
    status)  cmd_status ;;
    gates)   cmd_gates; summary ;;
    push)    cmd_push ;;
    pull)    cmd_pull ;;
    build)   cmd_build ;;
    restart) cmd_restart ;;
    verify)  run_verify ;;
    deploy)  cmd_deploy ;;
    secret)  cmd_secret ;;
    logs)    cmd_logs ;;
    menu)    cmd_menu ;;
esac
