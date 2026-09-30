---
'@walkeros/mcp': patch
---

`frame_manage` returns Tag Mode marks as a flat `tags` list plus the frame's
`note`. Tag `id`, `parentId` and `threadRef` come back literal when they have
the app's id shape, so an agent can rebuild the tag tree and pass a tag id to
`hub_manage` as `markId`. Other strings and non-identifier keys stay wrapped.
