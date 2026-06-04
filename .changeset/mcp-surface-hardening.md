---
'@walkeros/mcp': minor
'@walkeros/cli': minor
'@walkeros/transformer-ga4': patch
---

The MCP `flow_simulate` and `flow_bundle` tools now accept a cloud flow id as
`configPath`, so you can simulate or bundle a saved flow without a manual file
round-trip, and repeated simulations reuse a prebuilt bundle for faster runs.
Loading or fetching a flow with no default project set now returns a clear "no
default project" error, and `flow_examples` surfaces a referenced package's
shipped examples when a step has none inline. Bundle stats now report the real
total bundle size and list package names instead of a per-package estimate, and
the GA4 transformer documents its wiring contract via package hints.
