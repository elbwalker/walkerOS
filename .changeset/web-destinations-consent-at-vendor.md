---
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-clarity': patch
'@walkeros/web-destination-fullstory': patch
'@walkeros/web-destination-piwikpro': patch
---

A destination with `config.consent` now tells the vendor about consent changes:
Meta calls `fbq('consent', 'revoke' | 'grant')`, Matomo `forgetConsentGiven` and
`setConsentGiven`, Clarity sends ConsentV2, FullStory stops and starts capture,
and Piwik PRO turns off the link tracking it enabled.
