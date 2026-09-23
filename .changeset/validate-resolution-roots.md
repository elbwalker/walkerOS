---
'@walkeros/core': minor
---

`walkeros validate` now reports paths that can never resolve: an `ingest.` path
in mapping `data` or `policy`, which resolve against the event, and a cache key
or route match without an `event.` or `ingest.` prefix. Flow steps now declare
`state`, so its paths are validated too.
