---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
---

Add include/exclude destination filter to collector.push PushOptions.
Sources can now control which destinations receive their events.
Destination simulation uses the full collector pipeline with include filter,
giving production-identical event enrichment, consent, and mapping.
