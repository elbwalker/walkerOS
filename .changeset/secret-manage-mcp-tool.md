---
'@walkeros/mcp': minor
'@walkeros/cli': minor
---

Add a `secret_manage` MCP tool (and matching CLI functions) to manage a flow's
secrets. List secret metadata, create, rotate, and delete secrets that flow
steps reference as `$env.<NAME>`. Values are write-only: encrypted at rest and
never returned or logged.
