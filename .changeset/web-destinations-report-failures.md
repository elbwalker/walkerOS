---
'@walkeros/web-destination-amplitude': patch
'@walkeros/web-destination-api': patch
'@walkeros/web-destination-clarity': patch
'@walkeros/web-destination-d8a': patch
'@walkeros/web-destination-fullstory': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-heap': patch
'@walkeros/web-destination-hotjar': patch
'@walkeros/web-destination-linkedin': patch
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-mixpanel': patch
'@walkeros/web-destination-optimizely': patch
'@walkeros/web-destination-piano': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-posthog': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-tiktok': patch
---

A failed vendor call, a missing required setting (`config`) and an event that
cannot be sent (`missing-input`) are reported as failed pushes, with the
dead-letter queue and one ERROR line, instead of counting as delivered. Rules
with `silent: true` send no event. Settings schemas reject unknown keys.
