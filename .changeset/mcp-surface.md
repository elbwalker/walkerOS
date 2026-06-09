---
'@walkeros/mcp': minor
'@walkeros/cli': minor
'@walkeros/source-demo': patch
'@walkeros/transformer-ga4': patch
---

The MCP loads flows by ID and accepts a cloud flow id as `configPath` for
`flow_simulate` and `flow_bundle`, so you can simulate or bundle a saved flow
without a manual file round-trip, with repeated simulations reusing a prebuilt
bundle. A new `diagnostics` tool reports client and CLI versions plus backend
reachability, package discovery returns a complete catalog with a warning when a
source degrades (instead of silently caching partial results), and returned flow
configs are round-trip safe. Loading or fetching a flow with no default project
returns a clear "no default project" error, `flow_examples` surfaces a
referenced package's shipped examples when a step has none inline, and bundle
stats report real total size and package names. The demo source can be simulated
as a source step, the GA4 transformer documents its wiring contract via package
hints, and the CLI exports `VERSION` and `resolveAppUrl` and clears a deleted
default project.
