---
'@walkeros/core': patch
'@walkeros/server-store-fs': patch
---

Request caching now persists structured HTTP responses (including binary bodies)
to any store backend and honors TTL. Previously, caching a response to a
filesystem, S3, or GCS store could crash the process or never populate, and
entries never expired. Cached values now round-trip safely and expire correctly
instead of serving stale content after a redeploy.
