---
'@walkeros/core': patch
---

`observeEnv` no longer fills its returned `calls` array when a `record` callback
is given: each call goes to the callback only. Code that passed `record` and
also read `calls` must collect the calls in its callback. Without `record`,
`calls` works as before.
