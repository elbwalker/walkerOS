---
'@walkeros/server-core': patch
'@walkeros/server-destination-criteo': patch
---

`getHashServer` now accepts an `algorithm` option (`sha256` default, or `md5`),
so destinations can request either digest from the shared util instead of
calling Node crypto directly. Criteo's email hashing composes this util for its
md5, sha256, and sha256_md5 forms. No behavior change for existing SHA-256
callers.
