---
'@walkeros/core': minor
'@walkeros/collector': patch
'@walkeros/server-store-s3': patch
'@walkeros/server-store-gcs': patch
'@walkeros/cli': patch
---

`state` gains `mapping` to shape what a lookup returns or a write stores, merged
into the target. An undeclared `state.store`, or a `file: true` store, is now a
validation error in `walkeros validate` and deploy preflight; at runtime the
entry logs an error or is skipped with a warning. The s3 and gcs stores report
their `file` mode.
