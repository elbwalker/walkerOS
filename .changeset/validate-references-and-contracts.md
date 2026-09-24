---
'@walkeros/core': minor
'@walkeros/cli': patch
---

`walkeros validate` now warns when a `$flow.`, `$store.`, `$secret.` or
`$contract.` reference is malformed or used mid-string, where it would ship as
literal text. Contracts are checked only on `@walkeros/transformer-validate`
steps, whose own examples must agree with their settings, and an example `out`
written as effects is compared by the events it passes on.
