---
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-piano': patch
'@walkeros/web-destination-linkedin': patch
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-heap': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-tiktok': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-clarity': patch
---

Web destinations that load a vendor script inject it through the document of
their `env`, so simulation and server-side rendering work without a browser
page. A page still gets the script in its own document by default, and a missing
document fails the push with `vendor-not-ready`.
