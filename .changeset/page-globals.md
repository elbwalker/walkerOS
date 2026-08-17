---
'@walkeros/web-source-browser': patch
'@walkeros/collector': patch
---

Globals tagged with `data-elbglobals` are page level again: `walker init` on an
element no longer hides globals defined outside it. Collector globals are merged
into the event during enrichment, so destinations and post-collector
transformers see the same finished values. An event keeps the globals it was
captured with, so a later `walker globals` never reaches an event awaiting
consent.
