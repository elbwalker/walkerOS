---
'@walkeros/mcp': patch
---

`frame_manage` reads Tag Mode marks as tags: a flat `tags` list plus the frame's
own `note`. A tag's `id`, `parentId` and `threadRef` come back literal when they
have the id shape the app mints, so an agent can rebuild the tag tree and pass a
tag id to `hub_manage` as `markId`. Every other string value is wrapped.
