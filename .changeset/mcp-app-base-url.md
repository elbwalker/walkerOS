---
'@walkeros/mcp': patch
---

`diagnostics` reports the app URL the tool client actually talks to, so a hosted
MCP names its own deployment instead of the local CLI's default.

`ToolClient` gains a required `appBaseUrl()` method returning that base without
a trailing slash, so a custom implementation of that interface must add it.
