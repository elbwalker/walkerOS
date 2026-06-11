---
'@walkeros/mcp': patch
---

The `deploy_manage` tool now matches its real behavior: `deploy` honors `wait`,
`delete` removes an active deployment, and `list` accepts `cursor` and `limit`
for pagination. A failed deployment surfaces its error reason so an assistant
can report why a deploy did not succeed.
