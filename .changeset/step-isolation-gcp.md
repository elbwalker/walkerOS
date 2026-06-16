---
'@walkeros/server-destination-gcp': patch
---

Capture BigQuery Storage Write stream errors so a broken writer routes events to
the dead-letter queue instead of crashing the process, and re-open a broken
writer automatically on the next event.
