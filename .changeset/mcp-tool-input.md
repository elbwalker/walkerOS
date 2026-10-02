---
'@walkeros/mcp': patch
---

MCP tools validate their input against their input schema when called directly
through `createToolHandlers`, as they already were over the MCP transport.
Invalid input returns an error result naming each field instead of running on.
