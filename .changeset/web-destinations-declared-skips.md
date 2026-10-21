---
'@walkeros/web-destination-amplitude': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-clarity': patch
'@walkeros/web-destination-fullstory': patch
'@walkeros/web-destination-hotjar': patch
'@walkeros/web-destination-mixpanel': patch
'@walkeros/web-destination-posthog': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-tiktok': patch
---

A silent rule whose identify, group or similar mapping resolves to nothing sends
nothing, counts as delivered and writes one DEBUG line naming the call and
mapping key, never the value. An identity or group that is already current
writes nothing.
