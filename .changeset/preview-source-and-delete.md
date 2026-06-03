---
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

Preview creation can now target a deployed version: pass
`source: { kind: 'deployment-version', deploymentVersionId }` to `createPreview`
(CLI) or the MCP `flow_manage` `preview_create` action to preview what's live
instead of the flow's draft. Deleting a preview no longer errors on the empty
`204 No Content` response and resolves to a confirmation record.
