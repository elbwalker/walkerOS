---
'@walkeros/core': patch
---

New `StepError` carries a code, an HTTP status and `retryable`;
`acknowledge(result)` tells a producer to ack, retry or reject a message, and
`reportCause` writes one failure line per cause. `SendResponse` is `{ data }`.
An `init` of a destination, transformer or store can no longer return `false`:
throw a `StepError`, and untyped `false` fails with `not-ready`.
