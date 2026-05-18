---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Collector and destination buffers are now size-bounded with FIFO drop-oldest
eviction. Defaults: collector `queueMax: 1000`, destination `queueMax: 1000`,
destination `dlqMax: 100`. Set either knob to override per scope. Drop counts
surface in `collector.status.dropped` and `collector.status.destinations[id]`.
