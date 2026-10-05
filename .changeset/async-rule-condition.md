---
'@walkeros/core': patch
---

An async mapping rule `condition` is now awaited, in rule order, so a condition
that resolves to `false` no longer matches. A condition that throws is logged
and counts as no match. New `isThenable` helper export.
