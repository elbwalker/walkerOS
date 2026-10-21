---
'@walkeros/runner': patch
---

A flow's `logger.level` and `logger.format` apply to the collector's lines, and
the format to the runner's own lines; `--verbose` still forces DEBUG. A flow's
`logger.level`, DEBUG included, applies to the collector's lines without
`--verbose`. `flow handler error` logs at ERROR, a rejected heartbeat at WARN,
and Node process warnings go through the logger at WARN.
