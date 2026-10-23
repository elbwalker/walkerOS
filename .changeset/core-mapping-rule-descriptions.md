---
'@walkeros/core': patch
---

The mapping rule descriptions shown in property tables and `package_get` now
match the behaviour: a `condition` that returns false moves on to the next rule,
`batch` works only on a destination with `pushBatch`, `extend` applies only in
`@walkeros/transformer-ga4`'s `settings.mapping`, and the `mappingKey` and batch
`key` examples are `"product view"`.
