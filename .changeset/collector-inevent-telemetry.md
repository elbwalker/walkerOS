---
'@walkeros/collector': patch
---

Trace-level telemetry now carries the inbound event on every pipeline hop, so
per-step observers can show what each collector, transformer, and destination
actually received. The destination's outbound frame now reports the delivered
event as its payload, and the raw delivery response moves to `meta.response`.
