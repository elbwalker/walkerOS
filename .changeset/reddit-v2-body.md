---
'@walkeros/server-destination-reddit': patch
---

Send the Conversions API v2.0 body (`{ test_mode?, events }`) instead of the v3
`data` envelope, which v2.0 ignores. The user agent is sent as is, and hashed
identity fields are trimmed and lowercased first (an existing SHA-256 digest is
kept).
