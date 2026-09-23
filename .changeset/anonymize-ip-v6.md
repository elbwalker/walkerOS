---
'@walkeros/core': minor
'@walkeros/server-core': minor
---

`anonymizeIP` now handles IPv6, keeping the first 48 bits, and treats an
IPv4-mapped address (`::ffff:1.2.3.4`) as IPv4; both returned an empty string
before. `getHashServer` takes an optional `key` for a keyed HMAC hash; without
it the output is unchanged.
