---
'@walkeros/mcp': patch
---

`flow_manage list` without a `projectId` now wraps project and flow names in
`<user_data>`, like the list of one project, and both lists wrap a flow's
summary. Settings names stay literal.
