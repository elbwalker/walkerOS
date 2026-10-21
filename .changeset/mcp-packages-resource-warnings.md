---
'@walkeros/mcp': patch
---

The `walkeros://reference/packages` resource answers
`{ catalog, count, warnings? }` instead of a bare array, so a failed npm search
appears as a warning and a partial catalog is never read as an empty one.
