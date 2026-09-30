---
'@walkeros/cli': minor
'@walkeros/core': minor
---

`walkeros validate` warns on malformed or mid-string `$flow.`, `$store.`,
`$secret.` and `$contract.` references, paths that can never resolve, unknown
route targets, and routes shadowed by a `stop` or first match. Contracts bind
only on `@walkeros/transformer-validate` steps. Cross-step checks include an
object `out`.
