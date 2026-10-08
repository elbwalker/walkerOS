---
'@walkeros/core': minor
'@walkeros/transformer-validate': minor
---

`format: true` now accepts extra keys on `user` and `source` (custom user
attributes, GA4 transformer fields, a previous validate verdict), as the types
always allowed. `user.optout` is typed as a boolean. Unknown top-level fields
and wrong types still fail.
