---
'@walkeros/server-transformer-cache': minor
---

Add cache transformer for server flows. Caches HTTP responses with LRU eviction,
per-rule TTL, and respond-wrapping pattern (MISS caches + forwards, HIT serves
directly and stops chain).
