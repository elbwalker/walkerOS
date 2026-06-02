---
'@walkeros/core': patch
---

`FlowState` records can now carry an optional `platform` field
(`'web' | 'server'`) identifying the runtime that produced the state. Observers
can use it alongside `flowId` to correlate telemetry across web and server
runtimes of the same flow.
