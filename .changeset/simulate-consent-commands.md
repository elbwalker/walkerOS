---
'@walkeros/cli': minor
'@walkeros/mcp': minor
'@walkeros/core': minor
---

Simulate takes `--consent` (MCP `state.consent`) as the collector consent a step
starts from, and `--command` (MCP `command`) to run a command example such as
`consent` on a destination. Only the simulated destination starts. A destination
that sent nothing now says why in `skipped`: waiting for its `require`, or a
consent skip.
