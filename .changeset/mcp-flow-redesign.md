---
'@walkeros/mcp': minor
---

Redesign MCP flow server into unified orchestrator

- Rename tools to flow\_\* prefix (flow_validate, flow_bundle, flow_simulate,
  flow_push, flow_examples)
- Replace flow_init with flow_load (load existing or create new flows)
- Convert flow_schema tool to walkeros://reference/flow-schema resource
- Add 8 reference resources (event-model, mapping, consent, variables, contract,
  api, packages, flow-schema)
- Merge 17 API tools into single `api` tool with action enum (conditional on
  WALKEROS_TOKEN)
- Add 4 MCP prompts (add-step, setup-mapping, manage-contract, use-definitions)
- Summarize simulate output with per-destination results
- Standardize responses with mcpResult/mcpError and \_hints for next-step
  guidance
