---
'@walkeros/cli': patch
'@walkeros/core': minor
'@walkeros/mcp': patch
'@walkeros/runner': patch
---

Simulate and push output, CLI and flow logs, and the MCP `flow_simulate` and
`flow_push` results mask the values of secrets a flow references, also inside
JSON strings, numbers and URLs. `scrubSecrets` takes `known`, the CLI logger
`knownSecrets`, and `scrubJson` replaces `maskKnownNumbers`. MCP `flow_push` and
`flow_simulate` read their config once; a config that cannot be read stops the
run.
