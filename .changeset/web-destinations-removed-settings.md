---
'@walkeros/web-destination-optimizely': patch
'@walkeros/web-destination-snowplow': patch
---

Validation rejects `skipOdp` (Optimizely) and `pageViewTracking` (Snowplow):
neither was read, so they had no effect. Snowplow's settings schema now lists
every setting the code reads, with `collectorUrl` required, so a typo in a
setting name now fails validation.
