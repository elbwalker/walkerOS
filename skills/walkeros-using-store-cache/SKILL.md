---
name: walkeros-using-store-cache
description:
  Use when adding read-through caching to a walkerOS store, memoizing a slow
  API/Sheets backing, composing multi-tier cache chains, or deduplicating
  concurrent store reads. Covers recipes, TTL choice, error policy, and
  observability counters.
---

# Using store-level cache

## Overview

`Flow.Store.cache` wraps any store with a read-through, write-through cache
tier. Reads check the cache first, fall through to the backing on miss, and
populate every tier on the unwind. Writes go to the backing first, then to the
cache best-effort.

The wrapping is transparent: a transformer wired to `$store.crm` does not know
whether reads hit a memory cache, a Redis tier, or the underlying API.

**Core principle:** the cache is advisory. Backing is the source of truth.
Failed cache operations degrade performance, never correctness.

## When to use this skill

- A transformer reads the same key many times across events (sessions, user
  lookups, product catalog enrichment)
- A store has rate limits or slow HTTP round-trips (Sheets, custom API, S3
  metadata)
- You need to deduplicate concurrent reads on a cold key (thundering herd)
- You want to compose multi-tier caches (memory → Redis → API)
- You're migrating off `@walkeros/store-memory` (removed in favor of the
  built-in tier)

## Minimal recipe: cache a Sheets store

The talk-demo use case. A `sessions` lookup runs on every event but most events
in a session share the same key.

```json
{
  "stores": {
    "sessions": {
      "package": "@walkeros/server-store-sheets",
      "config": {
        "credentials": "$var.sheetsCredentials",
        "settings": {
          "id": "1AbC...",
          "sheet": "Sessions"
        }
      },
      "cache": { "rules": [{ "ttl": 300 }] }
    }
  },
  "transformers": {
    "enrich": {
      "package": "@walkeros/transformer-enrich",
      "env": { "store": "$store.sessions" }
    }
  }
}
```

The first lookup hits Sheets and populates the built-in in-memory tier with a
300-second TTL. The next 300 seconds of identical reads hit memory and skip the
Sheets API.

Without the cache: 60 events in 60 seconds = 60 Sheets reads = quota tripped (60
req/min limit) in one minute. With the cache: 60 events in 60 seconds = 1 Sheets
read.

## Recipe: memoize a slow API store

Same shape, longer TTL because the API is the cold backing:

```json
{
  "stores": {
    "users": {
      "package": "@walkeros/server-store-api",
      "config": { "settings": { "endpoint": "$env.USER_API_URL" } },
      "cache": { "rules": [{ "ttl": 3600 }] }
    }
  }
}
```

One-hour TTL is reasonable when user records change rarely. Use `flow_validate`
to verify the config; use `flow_simulate` with a representative event to confirm
the cache hit rate.

## Recipe: TTL by key prefix

Different keys can have different TTLs. Rules evaluate top-down, first match
wins. The match context is `{ key, value? }`, not event data:

```json
"cache": {
  "rules": [
    { "match": { "key": "key", "operator": "prefix", "value": "session:" }, "ttl": 300 },
    { "match": { "key": "key", "operator": "prefix", "value": "user:" }, "ttl": 3600 },
    { "ttl": 60 }
  ]
}
```

- `session:*` keys cache for 5 minutes
- `user:*` keys cache for 1 hour
- Everything else caches for 1 minute

A rule without `match` always matches. Place it last as a fallback.

## Recipe: multi-tier composition (memory → Redis → API)

When the working set exceeds the memory tier's capacity, add a Redis layer
between memory and the cold backing. The consumer still wires to `$store.api`;
the tiers resolve automatically.

```json
{
  "stores": {
    "redis": {
      "package": "@walkeros/server-store-redis",
      "config": { "settings": { "url": "$env.REDIS_URL" } },
      "cache": { "rules": [{ "ttl": 300 }] }
    },
    "api": {
      "package": "@walkeros/server-store-api",
      "config": { "settings": { "endpoint": "$env.API_URL" } },
      "cache": {
        "store": "redis",
        "rules": [{ "ttl": 86400 }]
      }
    }
  },
  "transformers": {
    "enrich": {
      "env": { "store": "$store.api" }
    }
  }
}
```

Lookup chain on `api.get(K)`:

1. `api`'s tier (Redis) — HIT, return.
2. On Redis MISS, the Redis wrapper checks its own tier (memory `__cache`). If
   memory HIT, return up and Redis populates.
3. On all MISS, call the underlying API. Each traversed tier populates on the
   unwind.

TTL ordering: shortest at the top (memory 300s), longest at the cold end (API
86400s). The bound on staleness is the longest TTL in the chain.

**Async-safe by design.** Whether your cache store's `get` is synchronous (the
built-in `__cache`, an in-memory store) or asynchronous
(`@walkeros/server-store-fs`, Redis, the cache wrapper itself), the collector
reads through with an `await` internally. You can mix sync and async stores
freely in a multi-tier chain without any extra configuration — the same HIT/MISS
semantics apply.

## Recipe: prevent thundering herd on a cold key

Single-flight deduplication is on by default. 50 concurrent
`store.get('session:abc')` calls on a cold cache produce **one** backing call,
not 50. All callers receive the same promise.

This is what makes store-level cache useful on a slow backing under high
concurrency. No configuration needed; just set `cache` on the store.

Verify it works with the `inflight_dedups` counter (see Observability below).

## What `cache` rules cannot do (compared to event cache)

Store rules are a stricter subset:

- **No `key` field.** The cache key comes from the caller (`store.get(K)`);
  there is no event path to compose.
- **No `update` field.** Stores have no event to mutate on hit.
- **No `stop` field.** Stores always fall through on miss; halting the pipeline
  is an event-cache concept.
- **Empty `namespace: ""` is rejected** by the schema (re-introduces the
  collision footgun across stores sharing `__cache`).

Use the [event-level Cache](../../website/docs/collector/cache.mdx) on sources,
transformers, or destinations when you need `key`, `update`, or `stop`.

## Default tier: built-in `__cache`

Omitting `cache.store` falls back to the collector's built-in `__cache`. It is
an in-memory LRU map with:

- `maxEntries: 10000` (fixed in v1)
- LRU access ordering on reads
- Batched eviction down to 80% on overflow
- Active TTL sweep every 60 seconds

Each wrapped store gets an automatic namespace prefix (the store id) so multiple
stores sharing `__cache` do not collide. Override with `cache.namespace: "myns"`
if you want explicit control.

The collector logs one line per wrapped store at startup:

```
store "sessions" caches with namespace "sessions:" via __cache
```

## Write-through error policy

`wrapped.set(K, V)` runs two steps:

1. **Backing first.** Await `backing.set(K, V)`. If this throws, the wrapper
   throws. The cache is not touched.
2. **Cache best-effort.** If the backing succeeded, attempt to populate the
   cache. If this throws, log a warning and return success.

`wrapped.delete(K)` follows the same shape. A failed cache delete leaves a
poisoned entry that serves stale data until TTL; the warning lets operators
react.

Backing is the source of truth. Code that wraps `set` / `delete` should assume
the cache may be lagging.

## Coherence model

Read this before relying on the cache for anything correctness-sensitive:

- **Read-your-writes (in-process):** yes. After `wrapped.set(K, V)`, a
  subsequent `wrapped.get(K)` in the same process returns `V`.
- **Cross-process consistency:** eventual, bounded by the longest TTL in the
  chain. No invalidation channel.
- **Tier-skipping repopulation:** a MISS in tier N that HITs in tier N+1
  repopulates tier N. Subsequent reads hit tier N.

Pick TTLs accordingly. Short TTLs (1-60s) for mostly-static lookups behind a
fast backing; long TTLs (minutes-hours) for cold, expensive lookups where
staleness is tolerable.

## Observability

Each wrapped store exposes counters. Per-store telemetry keys:
`walkeros.store_cache.<store_id>.<counter>`.

| Counter             | Use this to detect                  |
| ------------------- | ----------------------------------- |
| `hits`              | Cache is actually working           |
| `misses`            | Working-set size, cold start        |
| `populates`         | New keys being added to cache       |
| `writes`            | Set call volume                     |
| `deletes`           | Delete call volume                  |
| `evictions_entries` | `maxEntries` cap being hit          |
| `evictions_ttl`     | TTL sweeper finding expired entries |
| `inflight_dedups`   | Concurrent reads on a cold key      |

For interactive debugging at runtime:

```typescript
const { collector } = await startFlow({
  /* ... */
});
const snapshot = collector.stores.sessions.counters;
console.log(snapshot);
// { hits: 412, misses: 18, populates: 18, writes: 0, deletes: 0,
//   evictions_entries: 0, evictions_ttl: 0, inflight_dedups: 7 }
```

Healthy cache: `hits / (hits + misses)` rises over time. `inflight_dedups`
proves the herd prevention worked.

## Known limitations

- **No negative caching.** A `get(K)` that returns `undefined` from the backing
  is not populated. Every subsequent call for a missing key re-hits the backing
  until the value exists. Workaround: write a sentinel value on the first miss
  and treat it as "not present" in transformer logic.
- **No cross-process invalidation.** Writes from one process do not invalidate
  caches in other processes. TTL is the only mechanism.
- **Cycles are rejected at startup.** `A.cache.store = B` and
  `B.cache.store = A` throws during init. The collector logs the cycle path
  before exiting.
- **Renaming a store is a breaking change** to anything caching through it
  (`cache.store: "X"` references break). Migrate explicitly.

## Fetch & stash without `$code:`

When a step only needs to read a value out of a store or write one into it, you
do not need to wire `$store` into the step's `env` and hand-write a `$code:`
push. The declarative `state` block on a source, transformer, or destination
does both directions through the mapping engine.

```json
"transformers": {
  "stashGclid": {
    "state": { "mode": "set", "store": "sessions", "key": "user.session", "value": "data.gclid" }
  },
  "restoreGclid": {
    "state": { "mode": "get", "store": "sessions", "key": "user.session", "value": "data.gclid" }
  }
}
```

`key` is always the store side; `value` is always the event side. `mode` sets
the direction:

- **`set`** resolves `value` against the event (a path, constant, `fn`, or
  `map`) and writes that payload to the store under `key`.
- **`get`** reads `key` from the store and writes the fetched value onto the
  event at the `value` path. For a `get`, `value` must be a bare string path (or
  a `ValueConfig` with `key`), not a constant or operator.

Omit `store` to use the built-in `__cache` tier; state keys there are prefixed
with `state:` so they never collide with cache entries. State is **fail-open**:
a store error is logged and the event passes through unchanged. Use `state` for
simple fetch/stash; reach for `$code:` only when the logic is genuinely
non-declarative.

Full reference: [Website: State](../../website/docs/collector/state.mdx).

## Migration from `@walkeros/store-memory`

The dedicated `@walkeros/store-memory` package was deleted once the built-in
`__cache` reached feature parity. One-line migration per occurrence:

- If used **only** as a cache target (`cache.store: "memory"`): drop the store
  declaration and omit `cache.store`. The wrapper falls back to `__cache`
  automatically.
- If wired into a component's `env` for non-cache use: replace with a small
  inline `Map` inside the component, or use one of the persistent stores
  (`@walkeros/server-store-fs`, `-s3`, `-gcs`, `-sheets`).

`flow_validate` rejects `package: "@walkeros/store-memory"` and points at the
replacement.

## Related skills

- [walkeros-understanding-stores](../walkeros-understanding-stores/SKILL.md) -
  Store interface, `$store.` wiring, lifecycle
- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) -
  Architecture, stores as passive infrastructure
- [walkeros-using-cli](../walkeros-using-cli/SKILL.md) - Bundling and simulating
  flows with stores

**Documentation:**

- [Website: Store-level cache](../../website/docs/stores/cache.mdx) - Full
  reference for `Flow.Store.cache`
- [Website: Stores](../../website/docs/stores/index.mdx) - Stores overview
- [Website: Collector Cache](../../website/docs/collector/cache.mdx) -
  Event-level cache integrated into the collector (separate concept)

**Source files:**

- [packages/core/src/types/cache.ts](../../packages/core/src/types/cache.ts) -
  `Cache`, `StoreCacheRule`, `EventCacheRule` types
- [packages/collector/src/store-cache-wrapper.ts](../../packages/collector/src/store-cache-wrapper.ts) -
  Wrapper implementation
- [packages/collector/src/store.ts](../../packages/collector/src/store.ts) -
  Two-phase store init
