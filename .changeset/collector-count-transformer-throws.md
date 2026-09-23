---
'@walkeros/collector': patch
---

A transformer whose `push` throws still stops the chain and drops the event, and
is now also counted in `status.failed`, so diagnostics and health checks show
the failure instead of only a log line.
