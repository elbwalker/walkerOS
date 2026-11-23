---
'@walkeros/core': patch
'@walkeros/runner': patch
---

Log lines are masked once, and only when they leave the process (printed,
written to the error file or sent to the app), so masking costs far less on a
busy flow. Without `--flow-id` the runner keeps no log or error ring, as nothing
reads them.

Migration: `onLine` now receives a `TappedLine`, the function form of
`knownSecrets` is gone, ring entries carry `line`, and
`PipelineOptions.knownValues` is required.
