---
'@walkeros/transformer-ga4': patch
---

An event without a GA4 request in its ingest now fails with `missing-input`
instead of being dropped at debug level, so a source missing `config.ingest`
shows as an error. A request that cannot be decoded fails the event with code
`transformer`.
