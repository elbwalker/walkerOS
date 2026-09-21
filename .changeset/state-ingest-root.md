---
'@walkeros/core': minor
'@walkeros/collector': minor
---

`state` paths now resolve against `{ event, ingest }` and need an `event.` or
`ingest.` prefix, so a store can be keyed by request context. A `get` can write
into `ingest`, keeping the value off the event. An unresolvable key logs a
warning instead of failing silently. `buildCacheContext` is renamed
`createMappingRoot`.
