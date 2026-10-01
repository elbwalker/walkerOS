---
'@walkeros/cli': patch
'@walkeros/core': minor
'@walkeros/mcp': patch
'@walkeros/runner': patch
---

The values of secrets a flow references are masked in simulate and push output,
CLI and flow logs, and the MCP `flow_simulate` and `flow_push` results, also
inside JSON strings, numbers and URLs. The runtime masks the secret values it
fetches in every log path. `scrubSecrets` takes `known`, the CLI logger takes
`knownSecrets`, and `scrubJson` replaces the CLI's `maskKnownNumbers`.
