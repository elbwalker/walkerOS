---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Flow graph architecture: symmetric before/next hooks, mutable Ingest, per-destination isolation.

- Add symmetric `before`/`next` to all step types (sources, transformers, destinations)
- Add `Ingest` interface with mutable `_meta` tracking (hops, path)
- Parameterize `Transformer.Fn<T, E>` and `Result<E>` on event type
- Support `Result[]` return from transformers for fan-out
- Remove `Object.freeze(ingest)` — ingest is fully mutable
- Upgrade `setIngest` to create typed `Ingest` with `_meta`
- Clone ingest per destination to prevent cross-contamination
- Add `createMockContext` test utility for context construction
