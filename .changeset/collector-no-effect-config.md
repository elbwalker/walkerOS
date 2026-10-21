---
'@walkeros/collector': patch
---

A destination whose config sets `batch` without a `pushBatch`, or a mapping key
with no effect at its position, logs one ERROR when it registers and still runs.
A connection error that lost no event logs at WARN instead of ERROR.
