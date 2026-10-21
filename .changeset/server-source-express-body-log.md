---
'@walkeros/server-source-express': patch
---

The `Request body rejected` debug line carries only the status and content type,
never a body sample or the parser message. In respond-first mode a later
per-event failure logs at DEBUG, because the collector's ERROR line is the
signal.
