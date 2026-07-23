---
'@walkeros/mcp': patch
---

Agents can now open, inspect, and end an Observe session on a flow with the new
`observe_session` tool. It reports per-arm state, records received, and expiry,
and a preview grant minted while the flow is observed pairs with that Observe
session automatically. Read the events with `observe_journeys`.
