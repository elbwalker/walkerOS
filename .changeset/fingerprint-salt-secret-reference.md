---
'@walkeros/server-transformer-fingerprint': patch
---

The `salt` description, the hints and the step examples write the salt as
`$secret.FINGERPRINT_SALT`, as the docs do. The reference keeps the salt out of
the flow file, and a bundled flow whose secret is not set stops at start with
`required secret "FINGERPRINT_SALT" is not set`.
