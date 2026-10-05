---
'@walkeros/core': patch
'@walkeros/mcp': patch
---

MCP tool results are always an object: `mcpResult` answers a list as `{ items }`
and a bare value as `{ value }` instead of a bare or spread array, and
`project_manage list` always answers `{ projects }`.
