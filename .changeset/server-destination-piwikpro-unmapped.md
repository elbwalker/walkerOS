---
'@walkeros/server-destination-piwikpro': patch
---

Events that no rule maps, unknown methods, invalid arguments and a missing page
URL fail with `missing-input`; use an `ignore: true` rule to keep an event out
without a failure. Piwik PRO's own 429 warning is replaced by the collector's
line with the status.
