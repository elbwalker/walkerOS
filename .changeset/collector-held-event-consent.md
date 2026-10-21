---
'@walkeros/collector': patch
---

A held event keeps the consent it was admitted with: when its destination's hold
ends it is delivered even if the collector's consent changed in the meantime. A
mapping value problem now logs once per mapping rule instead of once for all
rules, so a second rule's problem is no longer hidden behind the first.
