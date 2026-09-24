---
'@walkeros/transformer-ga4': minor
---

Decoded GA4 events now carry `source.url` and `source.referrer`, which Meta,
Snapchat, Pinterest, Bing, TikTok and Criteo send. Piwik PRO now sends GA4
events it skipped before, so expect new hits. Fingerprint hashes of GA4 events
change once. `timestamp` is the receive time.
`globals.language`/`globals.screen` moved to `user.language`/`user.screenSize`;
update mappings reading them.
