---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/server-store-fs': patch
'@walkeros/server-store-s3': patch
'@walkeros/server-store-gcs': patch
'@walkeros/server-store-sheets': patch
---

Stores now use one structured value type with binary (`Uint8Array`) as a
first-class leaf, serialized by a shared codec. A new `file: true` store option
serves byte-exact assets such as walker.js (default is structured key-value),
and Sheets is structured-only and rejects `file: true`. Building on this,
request caching persists structured HTTP responses including binary bodies
(`Buffer`, `Uint8Array`, `ArrayBuffer`) to byte/string backends (filesystem, S3,
GCS, in-memory) and honors TTL, which is owned by the cache layer rather than
the store. Previously caching a response could crash the process or never
populate, and entries never expired; cached values now round-trip safely and
expire instead of serving stale content after a redeploy.
