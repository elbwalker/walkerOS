---
'@walkeros/cli': minor
'@walkeros/core': minor
'@walkeros/collector': patch
'@walkeros/mcp': patch
---

Source simulation gains a `collector` step that runs the real collector
enrichment and returns the fully enriched event. Transformer simulation now
accepts an optional raw `ingest` so request decoders like GA4 can be tested
standalone by supplying a `url`. The `flow_simulate` MCP tool accepts the new
collector step and the transformer `ingest` input.
