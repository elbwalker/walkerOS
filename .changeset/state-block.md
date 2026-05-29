---
'@walkeros/core': patch
'@walkeros/collector': patch
---

Add a declarative `state` block for `get`/`set` against a store, replacing
`$code:` for simple fetch and stash. Available on source, transformer, and
destination steps; defaults to an in-memory store.
