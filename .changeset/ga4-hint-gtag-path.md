---
'@walkeros/transformer-ga4': minor
---

New `settings.maxEvents` (default 100) caps the events decoded from one request.
A POST body with more lines is dropped whole, so one oversized body can no
longer fan out into thousands of concurrent events. The wiring hint now sets
`paths: ["/g/collect"]` on the express source and lists the sources that decode
batched gtag.js hits. Each `settings.mapping` entry is now validated as a
mapping rule, so a typo such as `ignore: "false"` fails validation.
