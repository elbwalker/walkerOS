#!/usr/bin/env bash
set -euo pipefail

# verify:touched — L1 verification per AGENT.md rule 11.
# Usage:
#   npm run verify:touched -- <pkg-name>
#   npm run verify:touched -- core
#   npm run verify:touched -- web-destination-gtag
#
# <pkg-name> is the segment after `@walkeros/`. Defaults to `core` if missing.

PKG="${1:-${npm_config_pkg:-core}}"

exec npx turbo run typecheck lint test --filter="@walkeros/${PKG}"
