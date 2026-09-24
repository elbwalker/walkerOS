---
'@walkeros/server-destination-reddit': minor
---

New `ip` and `userAgent` settings: Reddit Conversions API requests now send the
client IP and user agent as `user.ip_address` and `user.user_agent` (hashed) by
default, read from `ingest.ip`/`ingest.userAgent` or `user.ip`/`user.userAgent`.
A mapped value still wins. Set either setting to `false` to opt out.
