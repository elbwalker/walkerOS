---
'@walkeros/mcp': patch
'@walkeros/cli': patch
---

The MCP server carries `hub_manage`, which reads a flow's release history, its
rationale and the threads on it, and a read-only `frame_manage`, which reads the
frames of a measurement plan. The CLI gains the matching programmatic calls.
`ToolClient` gains eleven required methods, so a custom implementation of that
interface must add them.
