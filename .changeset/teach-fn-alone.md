---
'@walkeros/server-transformer-fingerprint': patch
'@walkeros/web-source-datalayer': patch
'@walkeros/cli': patch
---

Hints, types and examples now transform values with `fn` alone, which receives
the source, instead of pairing it with `key`, where it never ran. The dataLayer
source drops its unused `command` rule setting and the unused `MappedEvent`
type.
