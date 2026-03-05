---
'@walkeros/transformer-router': patch
---

Router now preserves the current event when branching instead of resetting it to
`{}`. Downstream transformers receive the event as-is. This is a behavioral fix
— the router should be a pure routing decision that doesn't modify event data.
