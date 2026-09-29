---
'@walkeros/core': minor
'@walkeros/server-core': minor
'@walkeros/server-transformer-fingerprint': minor
---

`anonymizeIP` now handles IPv6 (first 48 bits) and IPv4-mapped addresses;
`getHashServer` takes an optional HMAC `key`. The fingerprint transformer works
with just `{ salt }`: it hashes the anonymized IP, reduced user agent and site,
rotated daily. Hashes change once on upgrade; `rotate: "none"` keeps them
stable. A missing salt warns.
