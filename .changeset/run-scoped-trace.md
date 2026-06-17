---
'@walkeros/core': patch
'@walkeros/collector': patch
---

The collector now stamps a run-scoped trace id (`event.source.trace`) and a
per-run sequence number (`event.source.count`) onto every event, minted fresh on
each `run`. These group all events of a page load or run and are preserved
unchanged when events are forwarded from web to server, giving a stable
correlation id across the pipeline. Adds `getTraceId`, and `getSpanId` now uses
the cryptographic random source.
