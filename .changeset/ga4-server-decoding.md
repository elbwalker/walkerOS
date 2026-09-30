---
'@walkeros/server-source-express': patch
'@walkeros/transformer-ga4': minor
---

The express source passes non-JSON `text/plain` bodies, such as batched gtag
hits, to `ingest.body` instead of failing with 400. `@walkeros/transformer-ga4`
gives each decoded event its own stable id, caps one request at
`settings.maxEvents` (default 100), validates `settings.mapping` rules, and its
wiring hint sets `paths: ["/g/collect"]`.
