---
'@walkeros/core': minor
'@walkeros/collector': patch
---

Cache reads through `checkCache` are now correct against async stores
(filesystem, Redis, any store with an async `get`). Previously a custom async
store could silently miss the cache.

`checkCache` returns a Promise. External callers must add `await`.
