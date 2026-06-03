---
'@walkeros/mcp': minor
'@walkeros/cli': patch
'@walkeros/source-demo': patch
---

The MCP now loads flows by ID, requires the `flow_simulate` `step` parameter it
always enforced, and adds a `diagnostics` tool reporting client and CLI versions
plus backend reachability. Package discovery returns a complete catalog with a
warning when a source degrades, instead of silently caching partial results, and
returned flow configs are round-trip safe (structural values stay literal). The
demo source can now be simulated as a source step; the CLI also exports
`VERSION` and `resolveAppUrl` and clears a deleted default project.
