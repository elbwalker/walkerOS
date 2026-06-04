---
'@walkeros/core': patch
'@walkeros/server-store-fs': patch
---

Request caching now persists structured HTTP responses, including binary bodies
(`Buffer`, `Uint8Array`, `ArrayBuffer`), to byte/string store backends
(filesystem, S3, GCS, in-memory) and honors TTL. Previously, caching a response
could crash the process or never populate, and entries never expired. Cached
values now round-trip safely (binary bodies decode back as a `Buffer`) and
expire correctly instead of serving stale content after a redeploy.
