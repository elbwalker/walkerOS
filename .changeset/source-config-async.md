---
'@walkeros/core': patch
'@walkeros/server-source-express': patch
---

Add an optional `async` option to the source config (`Source.Config.async`) for
respond-first acknowledgement on response-producing server sources. The express
source now reads `config.async` (default `true`): a 2xx response means the event
was accepted, not yet delivered.
