---
'@walkeros/cli': patch
---

The `flow-complete.json` example stops an opted-out user (`user.optout`) first:
on the web nothing is sent, on the server the event stops before dedup. Piwik
PRO now gets the customer segment as custom dimension 1, and the GA4 purchase
rule drops its `consent`, which only repeated the destination consent.
