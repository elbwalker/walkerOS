---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Inside an array, a transformer's own `next` now runs right after it, then the
array continues. `many` works in every chain field: each match becomes its own
copy with a derived `event.id` that finishes the rest of the path. Unknown
transformer ids log a warning and the chain continues. `@walkeros/collector` no
longer exports `walkChain` or `extractTransformerNextMap`.
