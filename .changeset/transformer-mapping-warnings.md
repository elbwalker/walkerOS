---
'@walkeros/collector': patch
'@walkeros/core': patch
---

A code-less transformer now runs its `config.mapping` (it wins over the
step-level `mapping`), and a flow bundle keeps a code-less transformer whose
only mapping or state sits in `config`. Init warns about every mapping field
that does nothing in a transformer, rules in array form included, about a
mapping next to `code` or `package`, which never runs, and about a step-level
`mapping` that `config.mapping` overrides; `validateFlowStructure` reports the
same warnings. New exports: `getTransformerMapping`,
`getTransformerMappingWarnings`.
