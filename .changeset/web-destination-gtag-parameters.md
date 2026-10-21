---
'@walkeros/web-destination-gtag': patch
---

A GA4 parameter whose name is empty, or collides with another after
normalization, is dropped with one ERROR line per cause and the event is still
sent; before, it logged a warning per event and the later value overwrote the
earlier. gtag.js and GTM containers load through walkerOS.
