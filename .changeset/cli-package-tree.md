---
'@walkeros/cli': patch
---

`walkeros bundle --manifest` takes an optional `packages` field: `resolve`
installs only versions published at or before a cutoff and reports the tree it
installed, and `tree` installs exactly a recorded tree, checked against each
tarball's sha512, without resolving anything.
