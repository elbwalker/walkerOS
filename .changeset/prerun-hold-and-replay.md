---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/web-source-browser': minor
'@walkeros/server-source-express': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-source-aws': patch
---

Events pushed before the collector runs are now held and replayed at run instead
of being dropped, bounded by `queueMax`. `walker init <element>` re-fires load
triggers for already-tracked elements, restoring the SPA re-init pattern. Queue
sources start consuming at run and no longer acknowledge messages the pipeline
did not accept.
