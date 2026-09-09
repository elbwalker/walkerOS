---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

`fetchHealth` and `compareContract` accept an optional base URL, so a caller
that is not the local CLI can probe its own backend instead of the one resolved
from `WALKEROS_APP_URL` and the CLI config file. Omitting it keeps today's
resolution.

`diagnostics` passes the app URL it reports, so the contract verdict and
`appUrl.resolved` always describe the same backend. A hosted MCP no longer
probes production while naming its own deployment.
