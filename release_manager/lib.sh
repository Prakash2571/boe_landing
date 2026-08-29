#!/usr/bin/env bash

set -uo pipefail

BOE_SSH_ALIAS="${BOE_SSH_ALIAS:-beonedge}"
BOE_REMOTE_DIR="${BOE_REMOTE_DIR:-/srv/dev_stack/BOE_LANDING/repo}"
BOE_BRANCH="${BOE_BRANCH:-dev/tamagami-hi}"
BOE_REMOTE_NAME="${BOE_REMOTE_NAME:-origin}"
BOE_SERVICE="${BOE_SERVICE:-landing}"
BOE_CONTAINER="${BOE_CONTAINER:-boe-landing}"
BOE_APEX="${BOE_APEX:-https://beonedge.in}"
BOE_WWW="${BOE_WWW:-https://www.beonedge.in}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
    C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
    C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
    C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""
fi

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

heading() { printf '\n%s━━ %s%s\n' "$C_BOLD$C_BLUE" "$*" "$C_RESET"; }
pass()    { printf '  %s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail()    { printf '  %s✗%s %s\n' "$C_RED" "$C_RESET" "$*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn()    { printf '  %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; WARN_COUNT=$((WARN_COUNT + 1)); }
info()    { printf '  %s%s%s\n' "$C_DIM" "$*" "$C_RESET"; }
step()    { printf '\n%s▸ %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }

die() { printf '\n%serror:%s %s\n' "$C_RED$C_BOLD" "$C_RESET" "$*" >&2; exit 1; }

summary() {
    printf '\n%s' "$C_BOLD"
    printf '══════════════════════════════════════════\n'
    printf '  passed  %s\n' "$PASS_COUNT"
    printf '  failed  %s\n' "$FAIL_COUNT"
    [[ "$WARN_COUNT" -gt 0 ]] && printf '  warned  %s\n' "$WARN_COUNT"
    printf '══════════════════════════════════════════%s\n' "$C_RESET"
    [[ "$FAIL_COUNT" -eq 0 ]]
}

confirm() {
    local prompt="$1"
    if [[ "${BOE_ASSUME_YES:-false}" == true ]]; then
        info "$prompt — assumed yes"
        return 0
    fi
    if [[ ! -t 0 ]]; then
        die "$prompt — refusing to assume yes without a terminal; pass --yes"
    fi
    local reply
    read -r -p "  ${C_BOLD}${prompt}${C_RESET} [y/N] " reply
    [[ "$reply" == "y" || "$reply" == "Y" ]]
}

remote() { ssh -o BatchMode=yes "$BOE_SSH_ALIAS" "$@"; }

remote_reachable() {
    remote true >/dev/null 2>&1
}

require_remote() {
    remote_reachable || die "cannot reach ${BOE_SSH_ALIAS} over ssh"
}

git_local_head()  { git -C "$REPO_ROOT" rev-parse --short HEAD; }
git_local_dirty() { [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; }
git_remote_head() { remote "cd '$BOE_REMOTE_DIR' && git rev-parse --short HEAD" 2>/dev/null; }

container_status() {
    remote "docker inspect '$BOE_CONTAINER' --format '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'" 2>/dev/null \
        || echo "absent/absent"
}

http_code() {
    curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$@" 2>/dev/null || echo "000"
}

http_redirect() {
    curl -sS -o /dev/null -w '%{redirect_url}' --max-time 15 "$@" 2>/dev/null || echo ""
}
