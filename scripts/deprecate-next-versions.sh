#!/usr/bin/env bash
#
# Deprecate stale `-next` prereleases that have been superseded by a stable
# release. Run locally after a stable release, authenticated with your own
# 2FA-protected `npm login`. This used to run in CI, but npm Trusted
# Publishing (OIDC) covers only `npm publish`, not `npm deprecate`, and any
# long-lived write token would also be a publish token. Keeping this manual
# avoids storing such a token.
#
# Usage:
#   npm login                      # interactive, uses your 2FA
#   ./scripts/deprecate-next-versions.sh            # all published @walkeros packages
#   ./scripts/deprecate-next-versions.sh @walkeros/core @walkeros/cli   # subset
#
# For each package it reads the current stable version from npm, then
# deprecates every `<stable>-next*` version with a "Superseded by" message.

set -euo pipefail

if ! npm whoami >/dev/null 2>&1; then
  echo "Not logged in to npm. Run 'npm login' first (your 2FA session)." >&2
  exit 1
fi

# Package list: explicit args, or every non-private @walkeros workspace package.
if [ "$#" -gt 0 ]; then
  packages=("$@")
else
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  mapfile -t packages < <(
    find "$repo_root/packages" "$repo_root/apps" \
      -name package.json -not -path '*/node_modules/*' -not -path '*/dist/*' |
      while read -r f; do
        node -e "const p=require('$f'); if(!p.private && p.name && p.name.startsWith('@walkeros/')) console.log(p.name)" 2>/dev/null
      done | sort -u
  )
fi

for pkg in "${packages[@]}"; do
  [ -z "$pkg" ] && continue
  stable_version=$(npm view "$pkg" version 2>/dev/null) || {
    echo "$pkg: not found on npm, skipping"
    continue
  }
  [ -z "$stable_version" ] && continue

  next_versions=$(npm view "$pkg" versions --json 2>/dev/null |
    STABLE="$stable_version" node -e "
      const versions = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const stable = process.env.STABLE;
      const re = new RegExp('^' + stable.replace(/[.]/g, '\\\\.') + '-next[.\\\\-]');
      (Array.isArray(versions) ? versions : [versions])
        .filter(v => re.test(v))
        .forEach(v => console.log(v));
    " || true)

  if [ -z "$next_versions" ]; then
    echo "$pkg: no next versions matching ${stable_version}-next*"
    continue
  fi

  while IFS= read -r v; do
    echo "Deprecating $pkg@$v"
    npm deprecate "$pkg@$v" "Superseded by $pkg@$stable_version" ||
      echo "  (deprecate failed for $pkg@$v)"
  done <<<"$next_versions"
done
