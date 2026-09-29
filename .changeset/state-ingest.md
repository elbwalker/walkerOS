---
'@walkeros/cli': patch
'@walkeros/collector': minor
'@walkeros/core': minor
---

`state` paths resolve against `{ event, ingest }` and need an `event.` or
`ingest.` prefix; a `get` can write into `ingest`, and an unresolvable key
warns. Every step field now survives bundling: transformers with only `state` or
`mapping`, and code steps with `cache` or `state`, were silently dropped before.
`buildCacheContext` is renamed `createMappingRoot`.
