---
'@walkeros/cli': patch
---

`walkeros validate` reports unknown keys, mapping keys with no effect, values
without an operator, malformed references and `batch` without `pushBatch` as
errors (`MAPPING_NO_OP` replaces the warning `TRANSFORMER_MAPPING_NO_OP`), and
`bundle`, `push`, `simulate`, `setup` stop on them before building. An unknown
settings key is an error where the package closes its schema.
