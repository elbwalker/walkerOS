---
'@walkeros/server-source-express': patch
---

The `Request body rejected` debug line carries only the status and the content
type, no longer a body sample or the parser message, so a rejected request body
can never leak its content into the logs.
