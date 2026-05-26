---
'@walkeros/collector': patch
'@walkeros/cli': patch
'@walkeros/core': patch
---

The collector exposes `observers: Set<ObserverFn>` so any subscriber can watch
every step of the pipeline. Each source, transformer, destination, and store
call emits a `FlowState` record with timings, mapping match, consent state, and
skip reasons. `createTelemetryObserver` from `@walkeros/core` batches emissions
to an HTTP endpoint, and the CLI runtime picks up the `traceUntil` flag from its
heartbeat so trace mode toggles take effect without a redeploy.
