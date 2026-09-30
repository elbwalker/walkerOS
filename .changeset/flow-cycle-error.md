---
'@walkeros/core': minor
---

`getFlowSettings` throws a typed `FlowCycleError` for `$flow` and `$var` cycles,
with `code` (`FLOW_CYCLE` or `VAR_CYCLE`) and the `chain` of names; the message
is unchanged. `validateFlowConfig` reference warnings now carry the path of the
value that holds the reference, and an unresolvable root `contract` is an error
at `contract`.
