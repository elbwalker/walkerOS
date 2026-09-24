---
'@walkeros/cli': patch
'@walkeros/mcp': patch
'@walkeros/core': patch
---

Simulate output is scrubbed like logs: CLI text, `--json` and MCP
`flow_simulate` results pass through `scrubSecrets`, so service account keys,
private keys, `Authorization` headers and `access_token` values no longer
appear. The shared redactor, and with it the CLI and runtime loggers, now also
masks credential-named JSON fields and inline PEM keys.
