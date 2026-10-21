---
'@walkeros/web-destination-clarity': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-heap': patch
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-piano': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-tiktok': patch
'@walkeros/web-destination-linkedin': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-segment': patch
---

Vendor scripts load through walkerOS: a blocked or slow script fails later
events visibly (`vendor-not-loaded`, `vendor-timeout`) instead of losing them.
Pushes made while the script loads wait for it, and each script is injected once
per page.
