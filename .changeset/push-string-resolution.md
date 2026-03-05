---
'@walkeros/cli': patch
---

Resolve string event inputs (file paths, URLs, JSON strings) in the push() API,
matching the pattern already used by validate() and simulate(). Route
pushCommand through push() to eliminate duplicated resolution logic.
