---
'@walkeros/mcp': patch
---

A tool call with no project now names how to fix it, instead of stating that a
project is missing and stopping there. Five more `flow_manage` actions
(`update`, `delete`, `duplicate`, `preview_get`, `preview_delete`) resolve the
selected project first, so they no longer fail with a raw server error when
`projectId` is omitted.
