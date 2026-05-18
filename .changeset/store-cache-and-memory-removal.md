---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/mcp': minor
'@walkeros/server-transformer-file': patch
---

Add `Flow.Store.cache` for store-level caching: read-through + write-through
wrapper with single-flight dedup, recursive composition via `cache.store`, and
per-wrapper counters. `CacheRule` is now a discriminated union
(`EventCacheRule | StoreCacheRule`); schema rejects inert fields in store
contexts.

Built-in `__cache` upgraded with LRU, `maxEntries: 10000`, batched eviction, and
active TTL sweep.

**Breaking:** `@walkeros/store-memory` is removed. Its logic is absorbed into
`__cache`. Migration: drop the store declaration, or omit `cache.store` to use
the built-in tier. `flow_validate` flags legacy references.
