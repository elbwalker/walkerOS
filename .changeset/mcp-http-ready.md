---
'@walkeros/mcp': patch
---

Split `@walkeros/mcp` into a library entry (server factory plus `ToolClient`
abstraction) and a thin stdio binary. The package now exports
`createWalkerOSMcpServer`, `HttpToolClient`, `createStreamableHttpHandler`,
`TOOL_DEFINITIONS`, and the `ToolClient` interface so host applications can
mount walkerOS MCP tools over HTTP (e.g. from a Next.js Route Handler) or
consume them directly from non-MCP runtimes (e.g. Vercel AI SDK adapters). The
`walkeros-mcp` stdio binary is unchanged for end users; importing
`@walkeros/mcp` programmatically no longer auto-starts stdio.
