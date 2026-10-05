---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

`setDefaultProject` (MCP `project_manage set_default`) now needs a credential
instead of just a config file, works with only `WALKEROS_TOKEN` set, and refuses
while `WALKEROS_PROJECT_ID` names another project. The local MCP server now uses
`WALKEROS_PROJECT_ID` when a call names no project. New export:
`resolveProjectId()`.
