---
'@walkeros/core': patch
---

Fix `$flow` reference scanning to match the resolver's name grammar, so names
with leading digits or hyphens no longer produce false-positive references.
