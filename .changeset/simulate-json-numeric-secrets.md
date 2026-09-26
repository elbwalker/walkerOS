---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

Simulate `--json` output and MCP `flow_simulate` results stay valid JSON when a
known secret is digits only: a number that prints a secret value is replaced by
the string `"***"` before serializing, instead of leaving an unquoted `***` that
broke parsing.
