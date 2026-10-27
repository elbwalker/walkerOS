---
'@walkeros/cli': patch
---

`walkeros validate` checks each step's settings against the package version
`walkeros bundle` installs, inline `@version` specs on other steps included.
Steps that name one package at two inline versions are reported as skipped,
since the bundle refuses them.
