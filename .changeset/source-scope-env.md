---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/server-source-express': minor
'@walkeros/server-source-aws': minor
'@walkeros/server-source-gcp': minor
'@walkeros/server-source-fetch': minor
---

`Source.Context` no longer exposes `setIngest` or `setRespond`. Server sources
handling concurrent inbound requests must call
`context.withScope(rawScope, respond, body)` to bind per-request ingest and
respond. Browser and other single-scope sources keep working without changes.
