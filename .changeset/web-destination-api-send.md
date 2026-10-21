---
'@walkeros/web-destination-api': patch
---

A failed request (an error status, a network error, a timeout, a beacon the
browser refuses) is reported as a failed push instead of counting as delivered.
Without `settings.url` the destination fails with a `config` error. Batches over
64 KiB are no longer sent with `keepalive`.
