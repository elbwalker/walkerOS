---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/explorer': minor
'@walkeros/mcp': patch
---

New `collector.next`: a transformer chain that runs once per event, before the
event is handed to the destinations. Everything it produces reaches every
destination, and a `stop` in it drops the event for all of them; per-destination
filtering stays on `destination.before`. The explorer flow map draws this chain,
and the MCP guidance describes it.
