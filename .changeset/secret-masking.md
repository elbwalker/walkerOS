---
'@walkeros/cli': patch
'@walkeros/core': minor
'@walkeros/mcp': patch
'@walkeros/runner': patch
---

The values of secrets a flow references are masked in simulate output, CLI logs
and flow logs, also inside JSON strings. The runtime masks the secret values it
fetches in every log path, heartbeats and `--json` errors included. Simulate
output also scrubs credential-named fields, `Authorization` headers and PEM
keys. `scrubSecrets` takes `known`; the CLI logger takes `knownSecrets`.
