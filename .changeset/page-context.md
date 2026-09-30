---
'@walkeros/server-transformer-fingerprint': patch
'@walkeros/transformer-ga4': minor
'@walkeros/web-source-datalayer': minor
---

Decoded GA4 events and dataLayer events now carry `source.url` and
`source.referrer`, so conversion APIs such as Meta and Piwik PRO send them;
Piwik PRO now also sends GA4 events it skipped. Fingerprint hashes of these
events change once. GA4 `timestamp` is the receive time, and
`globals.language`/`globals.screen` moved to `user.language`/`user.screenSize`.
