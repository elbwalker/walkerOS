---
'@walkeros/server-destination-piwikpro': minor
---

New Piwik PRO server destination. A web destination mapping that uses the 13
portable methods produces the same hits on the server. Browser-only commands
such as `setUserId` are skipped. Events go to the Piwik PRO Tracking API as one
bulk request per push or batch. The `identified` setting chooses identified or
anonymous tracking, always or based on consent.
