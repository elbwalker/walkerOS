---
'@walkeros/web-core': patch
---

Wrap `localStorage`/`sessionStorage`/cookie operations in try/catch. Storage
access in private browsing (Safari), sandboxed iframes, or when quota is
exceeded throws `SecurityError`/`QuotaExceededError` — previously these crashed
the event pipeline at the call site. Reads now return empty, writes return empty
and do not persist, deletes are silently ignored.
