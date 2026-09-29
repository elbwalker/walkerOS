---
'@walkeros/collector': minor
'@walkeros/core': minor
---

Inside an array, a transformer's own `next` runs right after it, then the array
continues. `many` works in every chain field, each match becoming a copy with a
derived `event.id`. Unknown transformer ids warn and the chain continues, and a
throwing transformer counts in `status.failed`. `walkChain` and
`extractTransformerNextMap` are no longer exported.
