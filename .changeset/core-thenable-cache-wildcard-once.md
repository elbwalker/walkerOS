---
'@walkeros/core': patch
---

A failed async cache write no longer escapes as an unhandled rejection on pages
that replace the global `Promise`, and a `* *` mapping rule's condition runs
once per event instead of twice. A transformer with `code` or `package` that
declares both `config.mapping` and `mapping` now gets a warning naming both.
