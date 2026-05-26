---
'@walkeros/core': patch
'@walkeros/collector': patch
---

Adds `FlowState` type and `createTelemetryHooks` helper for emitting per-step
pipeline telemetry. Wire an `emit` callback into the collector's hooks to
observe every source/transformer/destination hop with timings, mapping match,
and contract result.
