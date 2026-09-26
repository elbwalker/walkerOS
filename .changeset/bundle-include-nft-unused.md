---
'@walkeros/cli': patch
---

Web builds now ignore the root `include` and log that they did, instead of
copying folders a browser bundle cannot read. A server build no longer fails
when a package in `bundle.packages` is never imported, for example one needed
only for types: it warns and suggests removing the package.
