---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

Unified source simulation input. All source simulation uses SourceInput {
content, trigger?, env? } — one format for CLI, MCP, and tests. Removes legacy
runSourceLegacy and deprecated SimulateSource fields. CLI gains --step flag. MCP
flow_simulate drops example parameter (use flow_examples to discover, then
provide event). flow_examples now returns trigger metadata. StepExample Zod
schema aligned with TypeScript type.
