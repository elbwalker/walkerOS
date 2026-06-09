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
serves byte-exact assets such as walker.js (default is structured key-value).
TTL is owned by the cache layer, not the store. Sheets is structured-only and
rejects `file: true`.
