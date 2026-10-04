---
'@walkeros/mcp': patch
'@walkeros/core': patch
'@walkeros/cli': patch
---

The MCP setup-mapping prompt, the MCP instructions, the schema descriptions and
the flow-complete example no longer claim that a mapping rule's `consent` gates
events. A rule's `consent` is not enforced yet; to require consent for a
destination, set `consent` in the destination's config.
