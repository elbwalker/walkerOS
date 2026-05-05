---
'@walkeros/cli': patch
---

Fix `walkeros bundle` failing on Windows when stage 2 import paths contained
backslashes that JS parsed as escape sequences.
