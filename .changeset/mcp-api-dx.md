---
'@walkeros/mcp': minor
'@walkeros/core': patch
'@walkeros/cli': patch
---

MCP api tool: replace overloaded `id` param with explicit `projectId` and
`flowId`. CLI functions now throw structured ApiError with code and details from
the API response. mcpError forwards structured error data to MCP clients.
