---
'@walkeros/server-transformer-file': patch
---

A file step now answers 503 when its store read fails, and a step with a
`prefix` answers 404 for a missing file inside it, instead of passing on to the
tracking pixel. A flow without a usable store stops at startup. Without a prefix
a missing file still passes on; `"prefix": "/"` claims every routed path.
