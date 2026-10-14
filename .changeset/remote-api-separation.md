---
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

New `walkeros api` sends any request to the walkerOS app API, `walkeros api ls`
lists its operations, `walkeros auth token` prints your token. The typed remote
commands (projects, flows, deploy, previews, observe, feedback) and their
programmatic functions are gone. The local MCP server keeps the flow tools;
saved flows and deployments move to the hosted server at
app.walkeros.io/api/mcp.
