---
'@walkeros/web-destination-clarity': patch
---

Without `settings.consent`, a consent-gated destination grants
`analytics_Storage` only and denies both categories on a revocation.
`ad_Storage` follows only `settings.consent`, so a grant no longer switches
advertising storage on by itself.
