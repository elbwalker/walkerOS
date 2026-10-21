---
'@walkeros/core': patch
---

Flow validation now rejects unknown keys in step `config`, destination and store
entries, the `collector` block, inline `code` and contract rules, mapping keys
with no effect at their position, values without an operator or with two
producers, and malformed whole-value references. Inline code may define
`pushBatch`, `on` and `destroy`. Strict `$flow` treats an empty value as
unresolved.
