---
'@walkeros/core': patch
---

Fix `getByPath` silently returning undefined for objects created in a different
realm (Node `http.IncomingMessage`, `vm` contexts, worker threads, iframes). The
internal `instanceof Object` guard is replaced with a cross-realm-safe check, so
dot-notation paths now extract fields from native request objects and other
cross-realm sources.
