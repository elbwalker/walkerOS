---
'@walkeros/web-source-datalayer': minor
'@walkeros/server-transformer-fingerprint': patch
---

dataLayer events now carry the page URL and referrer in `source.url` and
`source.referrer`, like browser source events. Destinations that read
`source.url` (Meta, Piwik PRO and other conversion APIs) start sending it for
dataLayer events. Fingerprint hashes of dataLayer events change once when `site`
uses its `source.url` default.
