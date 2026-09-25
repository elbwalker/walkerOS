---
'@walkeros/cli': minor
'@walkeros/mcp': minor
'@walkeros/core': minor
---

Simulate takes `--consent` (MCP `state.consent`) as the collector consent any
step starts from, sources included, and `--command` (MCP `command`) to run a
command example such as `consent` on a destination. Only the simulated step
starts. A destination that sent nothing now says why in `skipped`: waiting for
its `require`, or a consent skip.
