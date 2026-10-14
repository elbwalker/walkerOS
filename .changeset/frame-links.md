---
'@walkeros/mcp': patch
'@walkeros/cli': patch
---

`frame_manage` returns the frames a frame shows as `links` and its variant group
as `variantSetId`. `parentId`, `extends` and `placements` are gone from its
output, from the exported frame types and from what the CLI's `listFrames`,
`listPageFrames` and `getFrame` return. A page read returns that page's frames
only. `FRAME_HINT_EXTENDS_BASE` is now `FRAME_HINT_FOLLOW_LINKS`. Needs the
walkerOS app release that serves links.
