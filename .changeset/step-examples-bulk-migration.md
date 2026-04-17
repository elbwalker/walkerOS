---
'@walkeros/web-destination-amplitude': minor
'@walkeros/web-destination-clarity': minor
'@walkeros/web-destination-fullstory': minor
'@walkeros/web-destination-heap': minor
'@walkeros/web-destination-hotjar': minor
'@walkeros/web-destination-linkedin': minor
'@walkeros/web-destination-matomo': minor
'@walkeros/web-destination-meta': minor
'@walkeros/web-destination-mixpanel': minor
'@walkeros/web-destination-optimizely': minor
'@walkeros/web-destination-pinterest': minor
'@walkeros/web-destination-piwikpro': minor
'@walkeros/web-destination-plausible': minor
'@walkeros/web-destination-posthog': minor
'@walkeros/web-destination-segment': minor
'@walkeros/web-destination-snowplow': minor
'@walkeros/web-destination-tiktok': minor
'@walkeros/web-destination-api': minor
'@walkeros/web-destination-demo': minor
'@walkeros/server-destination-amplitude': minor
'@walkeros/server-destination-api': minor
'@walkeros/server-destination-aws': minor
'@walkeros/server-destination-bing': minor
'@walkeros/server-destination-criteo': minor
'@walkeros/server-destination-customerio': minor
'@walkeros/server-destination-datamanager': minor
'@walkeros/server-destination-file': minor
'@walkeros/server-destination-gcp': minor
'@walkeros/server-destination-hubspot': minor
'@walkeros/server-destination-kafka': minor
'@walkeros/server-destination-klaviyo': minor
'@walkeros/server-destination-linkedin': minor
'@walkeros/server-destination-meta': minor
'@walkeros/server-destination-mixpanel': minor
'@walkeros/server-destination-mparticle': minor
'@walkeros/server-destination-pinterest': minor
'@walkeros/server-destination-posthog': minor
'@walkeros/server-destination-reddit': minor
'@walkeros/server-destination-redis': minor
'@walkeros/server-destination-rudderstack': minor
'@walkeros/server-destination-segment': minor
'@walkeros/server-destination-slack': minor
'@walkeros/server-destination-snapchat': minor
'@walkeros/server-destination-sqlite': minor
'@walkeros/server-destination-tiktok': minor
'@walkeros/server-destination-twitter': minor
'@walkeros/web-source-browser': minor
'@walkeros/web-source-dataLayer': minor
'@walkeros/web-source-demo': minor
'@walkeros/web-source-session': minor
'@walkeros/web-source-cmp-cookiefirst': minor
'@walkeros/web-source-cmp-cookiepro': minor
'@walkeros/web-source-cmp-usercentrics': minor
'@walkeros/server-source-aws': minor
'@walkeros/server-source-express': minor
'@walkeros/server-source-fetch': minor
'@walkeros/server-source-gcp': minor
'@walkeros/transformer-validator': minor
'@walkeros/transformer-demo': minor
'@walkeros/server-transformer-file': minor
'@walkeros/server-transformer-fingerprint': minor
'@walkeros/store-memory': minor
'@walkeros/server-store-fs': minor
'@walkeros/server-store-gcs': minor
'@walkeros/server-store-s3': minor
---

Migrate every step example in every walkerOS package to the standardized
`[callable, ...args][]` shape introduced in `@walkeros/core`. Every step
example's `out` is now an array of effect tuples whose first element is the
callable's public SDK name (`'gtag'`, `'analytics.track'`, `'fbq'`,
`'dataLayer.push'`, `'sendServer'`, `'fetch'`, `'trackClient.track'`,
`'amplitude.track'`, `'fs.writeFile'`, `'producer.send'`, `'client.xadd'`,
`'client.send'`, `'dataset.table.insert'`, etc.). Source examples use `'elb'` as
the callable; transformer examples use the reserved `'return'` keyword; store
examples use store-operation callables (`'get'`, `'set'`). Tests capture real
calls on each component's spy and assert against `example.out` directly — the
hardcoded `PACKAGE_CALLS` registry in the app is no longer consulted (emptied;
plan #3 removes it structurally).
