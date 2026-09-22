---
'@walkeros/server-destination-piwikpro': minor
---

New Piwik PRO server destination. It takes the same mapping as the web
destination, so a web mapping copied to the server produces the same hits.
Events go to the Piwik PRO Tracking API as one bulk request per push or batch.
The `identified` setting chooses identified or anonymous tracking, always or
based on consent.
