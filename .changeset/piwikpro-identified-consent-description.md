---
'@walkeros/web-destination-piwikpro': patch
'@walkeros/server-destination-piwikpro': patch
---

The `identified` description and hint now explain why its consent states stay
out of `config.consent`: a destination needs only one granted state there, so a
repeated state lets events through on its own, and as the only state it holds
events back, so no anonymous hit is sent.
