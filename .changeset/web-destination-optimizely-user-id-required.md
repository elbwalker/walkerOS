---
'@walkeros/web-destination-optimizely': patch
---

`settings.userId` is required: the schema and `init` now say so. A flow without
it used to pass `walkeros validate` and then fail every event with
`missing-input`; it now fails validation and refuses to start with a `config`
error naming `userId`.
