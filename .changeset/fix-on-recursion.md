---
'@walkeros/collector': patch
---

Fix infinite recursion when registering `on('consent', ...)` handlers. The
collector's `on()` helper previously re-broadcast to all source `on` handlers,
causing self-re-registering consent handlers to recurse unbounded and crash the
tab. `on()` now fires only the newly-registered callback against current state.
