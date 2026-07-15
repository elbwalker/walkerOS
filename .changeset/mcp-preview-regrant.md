---
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

The `preview_regrant` action now works over the CLI-backed MCP client: mint a
fresh, origin-bound activation grant for an existing preview, optionally bound
to an Observe session via `sessionId`. `preview_create` with a `siteUrl` now
mints a real activation grant instead of returning no activation URL.
