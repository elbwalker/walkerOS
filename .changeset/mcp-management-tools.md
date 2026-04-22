---
'@walkeros/mcp': minor
'@walkeros/cli': patch
---

Replace `api` mega-tool with four focused management tools: `auth` (device code
login), `project_manage`, `flow_manage`, and `deploy_manage`. Enforce strict
CLI/MCP separation of concern — MCP no longer reads config files or checks env
vars directly. All tools are always registered regardless of auth state.

CLI exports new functions: `requestDeviceCode`, `pollForToken`,
`setDefaultProject`, `getDefaultProject`, `listAllFlows`,
`setFeedbackPreference`, `getFeedbackPreference`, `resolveToken`,
`deleteConfig`.

Preview CRUD (`preview_list`, `preview_get`, `preview_create`, `preview_delete`)
is now part of `flow_manage` — previews are a flow-scoped concern and belong
alongside the flow lifecycle actions rather than in a separate tool.
