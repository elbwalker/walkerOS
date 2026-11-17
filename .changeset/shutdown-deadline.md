---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/runner': patch
---

Shutdown drains within one 8 second deadline. The result names each failed
destination and whether its flush or its close failed, and the runner exits 1
when events were lost or a destination did not close cleanly.

Migration: set the platform's grace period to at least 10 seconds. Sources close
first and their close counts toward the 8 seconds, so a source
`shutdownTimeoutMs` above 5000 takes time from the batch flush.
