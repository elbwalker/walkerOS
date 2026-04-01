---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Add conditional routing and native cache as built-in config properties on
sources, transformers, and destinations.

**Routing:** NextRule[] in next/before properties enables conditional step
chaining, replacing @walkeros/transformer-router.

**Cache:**
- Cache rules use the same match syntax as routing (MatchExpression)
- Source cache: full pipeline caching with respond interception
- Transformer cache: step-level memoization, chain continues
- Destination cache: event deduplication
- Update rules modify cached results on read via getMappingValue
- Default per-collector memory store with namespaced keys

compileMatcher upgraded to use getByPath for scoped dot-paths (ingest.method,
event.name). Removed @walkeros/server-transformer-cache (replaced by native
cache).
