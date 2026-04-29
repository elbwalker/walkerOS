---
'@walkeros/mcp': patch
---

Add `flowCanvasResult` helper + `FlowCanvasToolResult` / `FlowCanvasPayload` /
`SuggestionTile` types for UI-renderable tool outputs. `flow_manage` actions
`get` / `create` / `update` now return a `kind: 'flow-canvas'` payload with
optional suggestion tiles so chat clients can render the flow graph inline.
