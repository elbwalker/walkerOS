---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/web-core': minor
'@walkeros/mcp': minor
'@walkeros/cli': minor
---

Flow observation records now assemble into per-event journeys spanning web and
server flows, each hop showing input, output, and status, with loss flagged; the
`observe_journeys` MCP tool exposes the same journeys to agents. Batching
destinations now emit per-event records, and live-web vendor calls are captured
when a destination reaches its callable through `getEnv`, though batched sends
stay uncaptured.
