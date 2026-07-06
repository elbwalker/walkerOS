---
'@walkeros/collector': minor
'@walkeros/core': minor
---

Unknown walker commands now log a warning and return `ok: false` instead of
silently succeeding. The elb function is exposed as `collector.elb`, a new
required field on `Collector.Instance`, replacing the internal `sources.elb`
pseudo-source.
