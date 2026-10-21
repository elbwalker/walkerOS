---
'@walkeros/web-destination-matomo': patch
---

An event that no rule maps fails with `missing-input` instead of a warning. An
invalid `goalId` sends the hit without the goal and logs one ERROR per cause. A
consent revocation sends `forgetConsentGiven`, stopping link tracking too, and
silent rules send only their goal.
