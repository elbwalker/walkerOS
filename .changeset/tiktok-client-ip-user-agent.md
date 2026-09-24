---
'@walkeros/server-destination-tiktok': minor
---

New `ip` and `userAgent` settings: TikTok Events API requests now send the
client IP and user agent as `context.ip` and `context.user_agent` by default,
read from `ingest.ip`/`ingest.userAgent` or `user.ip`/`user.userAgent`. A mapped
value still wins. Set either setting to `false` to opt out.
