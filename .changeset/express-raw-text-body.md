---
'@walkeros/server-source-express': patch
---

A `text/plain` POST body that is not JSON is no longer answered with 400. It
reaches `ingest.body` as the raw string, so multi-event gtag.js hits decode with
`@walkeros/transformer-ga4`. JSON sent as `text/plain` (sendBeacon) is still
parsed, and an unparseable `application/json` body still gets 400.
