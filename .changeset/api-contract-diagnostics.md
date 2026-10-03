---
'@walkeros/cli': patch
'@walkeros/mcp': patch
'@walkeros/runner': patch
---

New `walkeros diagnostics` command shows the CLI version, app URL, app health
and an API compatibility verdict checked per operation against the live app; the
MCP `diagnostics` tool reports it too and `walkeros://reference/openapi` serves
the live document. `compareContract` and `ContractComparison` are reshaped,
`annotateErrorWithDrift` is removed, and deployment listing rejects an unknown
`status` or `type`.
