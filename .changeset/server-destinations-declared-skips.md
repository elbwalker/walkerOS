---
'@walkeros/server-destination-segment': patch
'@walkeros/server-destination-rudderstack': patch
'@walkeros/server-destination-amplitude': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-destination-hubspot': patch
'@walkeros/server-destination-mixpanel': patch
---

A silent rule whose identify, group or similar mapping resolves to nothing sends
nothing, counts as delivered and writes one DEBUG line naming the call and
mapping key, never the value. HubSpot's warning and Mixpanel's error for this
case are now DEBUG, because nothing was lost.
