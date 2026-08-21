---
'@walkeros/cli': patch
---

A `path` entry in `config.bundle.packages` now counts as the package pin, so
bundling and setup use the local package instead of failing when steps still
declare conflicting inline versions of it.
