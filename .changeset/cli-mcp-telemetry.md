---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

Explicit opt-in anonymous usage telemetry for CLI and MCP. Telemetry is off by
default; users opt in with `walkeros telemetry enable` and out with
`walkeros telemetry disable`. No persistent identifier is written before opt-in.
No ingest endpoint ships in this release: opting in records consent locally;
emission begins when a managed endpoint is released. The data contract lives at
`packages/cli/src/telemetry/flow.json`.
