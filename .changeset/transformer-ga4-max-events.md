---
'@walkeros/transformer-ga4': patch
---

A request with more events than `settings.maxEvents` is dropped whole and now
writes an ERROR line, no longer a WARN, because those events are lost. Raise
`maxEvents` if your own server-to-server calls send larger batches.
