---
'@walkeros/server-destination-api': patch
'@walkeros/server-destination-bing': patch
'@walkeros/server-destination-criteo': patch
'@walkeros/server-destination-linkedin': patch
'@walkeros/server-destination-meta': patch
'@walkeros/server-destination-mparticle': patch
'@walkeros/server-destination-pinterest': patch
'@walkeros/server-destination-piwikpro': patch
'@walkeros/server-destination-reddit': patch
'@walkeros/server-destination-slack': patch
'@walkeros/server-destination-snapchat': patch
'@walkeros/server-destination-tiktok': patch
'@walkeros/server-destination-twitter': patch
'@walkeros/server-destination-klaviyo': patch
'@walkeros/server-destination-customerio': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/server-destination-datamanager': patch
---

A failed request is reported as a failed push (dead-letter queue, one ERROR line
with the status) instead of counting as delivered or being logged at debug.
Events a destination cannot send, such as a missing user identifier, fail with
`missing-input`. Rules with `silent: true` send no event of their own.
