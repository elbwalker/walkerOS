---
'@walkeros/core': patch
'@walkeros/mcp': patch
'@walkeros/cli': patch
---

Merge `definitions` into `variables`. Single concept, single syntax
`$var.name(.deep.path)?`. Whole-string references preserve native type; inline
interpolation requires scalars. Deep paths and recursive resolution with cycle
detection now supported. `Flow.Definitions`, `Flow.Primitive`, and the `$def.`
reference syntax are removed.
