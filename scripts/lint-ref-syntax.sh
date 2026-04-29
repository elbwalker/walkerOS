#!/usr/bin/env bash
# Fail if legacy reference-syntax ($store: or $secret:) reappears in source.
# Canonical rule: "." for names/paths, ":" for literal values or raw-code payloads.
# - $store:id  -> $store.id
# - $secret:NAME -> $secret.NAME
# - $env.NAME:default and $code:... keep their ":" (value/payload markers).
set -eu

cd "$(dirname "$0")/.."

hits=$(grep -rE '\$store:|\$secret:' \
  packages website skills apps \
  --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' --include='*.json' \
  2>/dev/null \
  | grep -v '/dist/' \
  | grep -v '/node_modules/' \
  | grep -v '/storybook-static/' \
  | grep -v '/.changeset/' \
  | grep -v '/build/' \
  | grep -v 'CHANGELOG.md' \
  | grep -v 'references.test.ts' \
  | grep -v 'refs.test.ts' \
  || true)

if [ -n "$hits" ]; then
  echo "Legacy reference syntax found. Use \$store. and \$secret. instead." >&2
  echo "$hits" >&2
  exit 1
fi
echo "OK — no legacy reference syntax found."
