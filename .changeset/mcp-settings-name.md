---
'@walkeros/mcp': minor
---

`deploy_manage` and `flow_manage` `preview_create` take the settings identifier
as `settingsName`. `flowName` is only a display name in results. Unknown input
keys on these two tools are now rejected instead of ignored.
