---
'@walkeros/web-destination-piwikpro': patch
---

The Piwik PRO goal examples use a goal UUID as `goalId` instead of `goal_1`:
Piwik PRO identifies a goal by its UUID or a legacy integer id, so a copied
example now shows the id format that Piwik PRO accepts.
