---
'@walkeros/collector': patch
---

An event JSON cannot serialize, such as one with a circular reference, is
refused as invalid input. Invalid events are now logged as errors, once per
source and minute, and Observe shows the push result's failure code. The
conformance kit expects network failures thrown as a `StepError`, as
`sendServer` and `sendWeb` do; a raw `fetch` error fails it.
