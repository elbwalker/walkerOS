---
'@walkeros/server-destination-criteo': minor
---

New `ip` and `userAgent` settings: Criteo Events API requests now send the
client IP and user agent as `ip` and `useragent` by default, read from
`ingest.ip`/`ingest.userAgent` or `user.ip`/`user.userAgent`. A mapped value
still wins. Set either setting to `false` to opt out.
