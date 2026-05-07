---
'@walkeros/server-destination-gcp': patch
'@walkeros/collector': patch
---

Surface destination init errors in logs at ERROR level. Previously, two layers
swallowed errors silently: the gcp destination's init catch only logged for
`isNotFound` errors and re-threw everything else without logging; the collector
wrapped `destinationInit` with `tryCatchAsync` (no `onError`), which silently
returned `undefined` on a thrown error and treated the destination as
not-initialized. Combined effect: a real init failure (e.g., the recent
`streamType` regression in BigQuery Storage Write API call) showed only
`[gcp-bigquery] init` in DEBUG logs and nothing else, regardless of log level.

Now: gcp's init catch logs every error at ERROR before re-throwing (with
consistent `error:` context key), AND the collector logs at ERROR via
`logger.scope(destType).error('Destination init threw', { error })` if init
throws or rejects. Failures are never silent. Mocks updated to enforce the new
shapes; tests cover both sync-throw and async-rejection variants.
