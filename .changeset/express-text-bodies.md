---
'@walkeros/server-source-express': patch
---

POST bodies sent as `text/plain` that are not JSON, such as GA4 gtag batches, no
longer fail with 400. They reach `ingest.body` as the raw string, so
`@walkeros/transformer-ga4` now decodes batched hits. sendBeacon JSON is parsed
as before, and malformed `application/json` is still rejected with 400.
