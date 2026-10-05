---
'@walkeros/collector': patch
---

An event a source drops because its `config.consent` is not granted is no longer
silent: the push result says `dropped: true`, a debug log names the source, and
observers see a `skip` with the reason `consent`.
