---
'@walkeros/server-destination-twitter': minor
---

New `ip` and `userAgent` settings: X (Twitter) Conversions API requests now send
the client IP and user agent as the `ip_address` and `user_agent` identifiers by
default, read from `ingest.ip`/`ingest.userAgent` or `user.ip`/`user.userAgent`.
A mapped value still wins. Set either setting to `false` to opt out.
