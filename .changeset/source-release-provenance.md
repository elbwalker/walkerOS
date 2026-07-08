---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
---

Events now carry per-flow config provenance on `event.source.release`, a
flow-name to release map that accumulates as an event crosses flows (web capture
to server processing), so a delivered event shows which config handled it. The
collector no longer stamps `source.version` (external source emitters may still
set it). In this first version, aws and gcp crossings are not yet covered.
