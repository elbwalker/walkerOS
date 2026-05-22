---
'@walkeros/cli': patch
---

The simulate functions (`simulateSource`, `simulateTransformer`,
`simulateDestination`) now return the unified `Simulation.Result` shape with
captured `events` and intercepted `calls`, instead of the internal push result.
`PushResult` no longer carries the simulate-only `captured`, `usage`, and
`perDestination` fields.
