---
'@walkeros/mcp': patch
---

The `walkeros://reference/examples` resource now ships inside the package, so it
also works when a host bundles the MCP server. Before, a bundled server answered
`Example not found` instead of the complete flow example, because it looked the
file up on disk at runtime.
