---
'@walkeros/core': patch
---

The `PushResult.error` description now says when it is set: for a rejected event
or a failure before the destinations. A destination's failure is reported in
`failed`, under its id with a `reason`, and leaves `error` unset.
