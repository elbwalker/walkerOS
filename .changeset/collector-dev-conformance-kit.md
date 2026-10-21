---
'@walkeros/collector': patch
---

`@walkeros/collector/dev` adds `runExamples`, which runs step examples on a real
collector, and `conformance`, a test kit with profiles (`http`, `sdk-env`,
`web-sdk`, `vendor-global`, `socket`, `transformer`, `source`) that checks the
failure contract of a destination, source, transformer or store and reports
every broken item at once.
