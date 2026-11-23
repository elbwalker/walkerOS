---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/runner': minor
---

The Observe usage report carries the memory, CPU time and event loop delay of
the process that runs the flow, as `runtime` rows. `runneros` fills them every
10 seconds through the new `status.runtime` (`Collector.RuntimeStatus`); a
collector without such a host sends none, and a flow that reports changes no
option.
