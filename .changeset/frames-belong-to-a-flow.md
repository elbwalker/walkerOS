---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

Frames belong to a flow: `frame_manage` (list, page and get) and the CLI frame
reads now take the `flowId` of the flow they live in. Deleting a flow also
deletes its frames.

A frame read also returns `lastSavedVersion`, `lastSavedNumber` and
`markupAssetId`, so a client can tell whether a frame has changed since it was
last saved as a version.
