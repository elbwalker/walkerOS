---
'@walkeros/server-destination-meta': minor
---

New `ip` and `userAgent` settings: Meta Conversions API requests now send the
client IP and user agent as `user_data.client_ip_address` and
`user_data.client_user_agent` by default, read from
`ingest.ip`/`ingest.userAgent` or `user.ip`/`user.userAgent`. A mapped value
still wins. Set either setting to `false` to opt out.
