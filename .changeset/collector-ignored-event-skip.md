---
'@walkeros/collector': patch
---

An event that a rule with `ignore: true` drops is reported as skipped, not
delivered: it is no longer under `done`, does not move `count`, and counts in
`skipped`. A source answers `{ ok: true, dropped: true }`. New `walker flush`
sends every pending destination batch at once and leaves the collector running.
