#!/usr/bin/env bash
#
# Configure npm Trusted Publishing (GitHub Actions OIDC) for every published
# package in this workspace, in bulk. Replaces clicking the Trusted Publisher
# form once per package on npmjs.com.
#
# Requirements:
#   - npm >= 11.10.0  (the version that ships `npm trust`)
#   - logged in: `npm login` (your 2FA session)
#
# 2FA tip: before running, on npmjs.com enable "skip 2FA for the next 5
# minutes" so the ~80 `npm trust` calls don't each prompt for an OTP. A
# 2-second sleep between calls (built in below) stays under rate limits and
# fits inside the 5-minute window.
#
# Usage:
#   ./scripts/setup-trusted-publishers.sh             # configure all
#   ./scripts/setup-trusted-publishers.sh --list      # show current config
#   ./scripts/setup-trusted-publishers.sh @walkeros/core @walkeros/cli   # subset
#
# Idempotent: re-run any time, including after adding new packages. A package
# that does not yet exist on npm will fail here (npm trust targets existing
# packages). For a brand-new package, publish it once manually with your 2FA
# login to create it, then re-run this script to attach the trusted publisher.

set -uo pipefail

REPO="elbwalker/walkerOS"
WORKFLOW="release.yml"
ENVIRONMENT="npm-publish"

# --- preflight ---------------------------------------------------------------
npm_ver="$(npm --version)"
req="11.10.0"
lowest="$(printf '%s\n%s\n' "$req" "$npm_ver" | sort -V | head -1)"
if [ "$lowest" != "$req" ]; then
  echo "npm $npm_ver is too old. 'npm trust' needs >= $req. Run: npm install -g npm@latest" >&2
  exit 1
fi
if ! npm whoami >/dev/null 2>&1; then
  echo "Not logged in to npm. Run 'npm login' first (your 2FA session)." >&2
  exit 1
fi

mode="configure"
explicit=()
for arg in "$@"; do
  case "$arg" in
    --list) mode="list" ;;
    *) explicit+=("$arg") ;;
  esac
done

# --- package list: explicit args, or every non-private WORKSPACE package -----
# Uses `npm query .workspace` so the set matches exactly what `changeset
# publish` pushes. A plain recursive find would also pick up non-workspace
# package.json files (test fixtures, unlisted demos) that never get published.
if [ "${#explicit[@]}" -gt 0 ]; then
  packages=("${explicit[@]}")
else
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  mapfile -t packages < <(
    npm query .workspace --prefix "$repo_root" 2>/dev/null |
      node -e "
        const ws = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        ws.filter(p => !p.private && p.name).map(p => p.name).sort().forEach(n => console.log(n));
      "
  )
fi

echo "${#packages[@]} package(s); repo=$REPO workflow=$WORKFLOW env=$ENVIRONMENT"
echo

ok=0
fail=0
failed_pkgs=()
for pkg in "${packages[@]}"; do
  [ -z "$pkg" ] && continue
  if [ "$mode" = "list" ]; then
    echo "== $pkg =="
    npm trust list "$pkg" || echo "  (no config / not found)"
    continue
  fi
  echo "Configuring $pkg ..."
  if npm trust github "$pkg" \
      --file "$WORKFLOW" \
      --repo "$REPO" \
      --env "$ENVIRONMENT" \
      --yes; then
    ok=$((ok + 1))
  else
    fail=$((fail + 1))
    failed_pkgs+=("$pkg")
    echo "  FAILED: $pkg (likely not yet published, or insufficient access)"
  fi
  sleep 2
done

if [ "$mode" = "configure" ]; then
  echo
  echo "Done. configured=$ok failed=$fail"
  if [ "$fail" -gt 0 ]; then
    echo "Failed packages:"
    printf '  %s\n' "${failed_pkgs[@]}"
  fi
fi
