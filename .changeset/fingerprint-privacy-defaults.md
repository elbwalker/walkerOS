---
'@walkeros/server-transformer-fingerprint': minor
---

The fingerprint now works with just `{ salt }`: it hashes the anonymized IP, the
reduced user agent and the site, keyed with the salt and rotated daily. Hashes
change once on upgrade, and configs without a date field now rotate daily
(`rotate: "none"` keeps them stable). The IP is anonymized for IPv6 too. A
missing salt logs a warning.
