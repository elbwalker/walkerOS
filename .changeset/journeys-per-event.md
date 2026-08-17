---
'@walkeros/core': minor
---

Journeys now assemble per event: one journey per event, identified by that
event's id, with the run trace carried as a handle so every event of one page
load or container run still groups together. A `$flow` crossing that decodes
into several events yields one journey per event, linked by `parentEventId`,
instead of folding them into a single row. A new optional `unattributed` summary
reports records the assembly could not attribute to any event instead of
dropping them silently.
