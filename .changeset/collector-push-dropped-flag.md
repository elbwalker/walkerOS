---
'@walkeros/core': patch
'@walkeros/collector': patch
---

Push results now report when an event was intentionally dropped by a transformer
chain, via a new `PushResult.dropped` flag, instead of a drop looking identical
to a normal delivery. The chain result also names which transformer stopped the
chain (`ChainResult.droppedBy`), and the collector logs the drop at debug level.
