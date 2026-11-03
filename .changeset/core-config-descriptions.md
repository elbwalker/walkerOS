---
'@walkeros/core': patch
---

Corrected schema descriptions and type docs: `init: true` marks a step as
already initialized and skips its `init()`, an open breaker fails events with
`breaker-open`, a timed-out `on()` handler blocks the destination after one more
window, a server flow's `observe` block has no effect, and the source `ingest`
example wraps its fields in `map`.
