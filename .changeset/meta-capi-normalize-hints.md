---
'@walkeros/server-destination-meta': patch
---

Customer information is now normalized per Meta's rules before hashing, so
`" User@Example.com"` and `"user@example.com"` produce the same hash. The
earlier `user_data` hint showed `email` and `phone`, which were sent to Meta
unhashed: rename them to `em` and `ph`. Unknown `user_data` keys are now
rejected by `walkeros validate` and TypeScript, and dropped with a warning at
runtime; a `url` without a trailing slash also builds a valid endpoint.
