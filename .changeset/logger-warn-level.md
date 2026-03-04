---
'@walkeros/core': minor
'@walkeros/cli': patch
'@walkeros/collector': patch
---

Add WARN log level (ERROR=0, WARN=1, INFO=2, DEBUG=3). Logger instances expose
`warn()` method routed to `console.warn` and `json()` method for structured
output. Config accepts optional `jsonHandler`. MockLogger includes both as jest
mocks. CLI logger unified with core logger via `createCLILogger()` factory.
