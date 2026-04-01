---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
---

Add include/exclude destination filter to collector.push PushOptions.
Sources can now control which destinations receive their events.
Rewrite simulateDestination to use full collector pipeline with include filter,
giving production-identical event enrichment, consent, and mapping.
Remove unnecessary async drain from simulateSource.
