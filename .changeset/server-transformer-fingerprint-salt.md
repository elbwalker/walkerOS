---
'@walkeros/server-transformer-fingerprint': patch
---

`settings.salt` is required; without it the transformer does not start. An event
whose IP, user agent and fields all resolve empty fails with `missing-input`
instead of getting the hash every other visitor gets.
