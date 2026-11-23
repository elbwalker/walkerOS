---
'@walkeros/runner': patch
'@walkeros/core': patch
'@walkeros/cli': patch
---

A remote runner fetches the web files its server release lists and replaces them
with no restart when a web part is released. A web file is checked against its
own release before it is placed, and a fetch that fails keeps the file that
serves.
