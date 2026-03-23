---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Add native cache as a built-in config property on sources, transformers, and
destinations.

- Cache rules use the same match syntax as routing (MatchExpression)
- Source cache: full pipeline caching with respond interception
- Transformer cache: step-level memoization, chain continues
- Destination cache: event deduplication
- Update rules modify cached results on read via getMappingValue
- Default per-collector memory store with namespaced keys
- compileMatcher upgraded to use getByPath for scoped dot-paths (ingest.method,
  event.name)
- Route renamed to NextRule for naming consistency
- Removed @walkeros/server-transformer-cache (replaced by native cache)
