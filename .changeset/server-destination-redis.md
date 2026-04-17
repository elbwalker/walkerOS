---
'@walkeros/server-destination-redis': minor
---

Add server-side Redis Streams destination via ioredis. Supports XADD append with
auto-generated entry IDs, JSON and flat serialization modes, approximate and
exact MAXLEN trimming, per-rule stream key overrides, env-injected client
pattern for testing, and graceful shutdown via client.quit().
