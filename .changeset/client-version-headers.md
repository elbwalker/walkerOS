---
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

Clients now send `User-Agent`, `X-WalkerOS-Client`, and
`X-WalkerOS-Client-Version` on every request to the walkerOS app. When the app
returns `426 Upgrade Required`, the CLI prints the required version + upgrade
instruction and exits with code 2; the MCP surfaces the same info in tool
errors. Set `WALKEROS_CLIENT_TYPE=runner` to have the CLI binary identify as a
long-lived runner instead of an interactive CLI (used by the runtime image so
runners are distinguishable from interactive sessions).
