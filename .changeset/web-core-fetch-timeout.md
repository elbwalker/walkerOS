---
'@walkeros/web-core': patch
---

Web requests sent via fetch now support a configurable timeout, defaulting to 10
seconds. A stalled network request is aborted instead of hanging indefinitely.
