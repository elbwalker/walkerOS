---
'@walkeros/collector': minor
---

A source or destination with a `require` gate now activates reliably from the
collector's current recorded state, regardless of source init order or which
source provided the required state (such as a CMP applying consent). CMP and
session sources now perform their initial consent read during `init()`, so
construction stays side-effect free.
