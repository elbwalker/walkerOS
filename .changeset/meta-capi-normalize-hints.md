---
'@walkeros/server-destination-meta': patch
---

Customer information is normalized per Meta's rules before hashing, so
differently cased or padded emails hash the same. The earlier `user_data` hint
sent `email` and `phone` unhashed: rename them to `em` and `ph`. Unknown
`settings.user_data` keys fail validation, unknown mapped keys are dropped with
a warning, and a `url` without trailing slash works.
