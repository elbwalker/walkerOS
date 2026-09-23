---
'@walkeros/core': minor
'@walkeros/cli': patch
---

Every step field now survives bundling. A transformer with only `state` or
`mapping`, and inline code steps with `cache` or `state`, were silently dropped
from the bundle before and did nothing at runtime. `mapping` is now a typed
transformer field, and bundles no longer carry `variables`.
