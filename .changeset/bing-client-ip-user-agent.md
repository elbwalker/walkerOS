---
'@walkeros/server-destination-bing': minor
---

New `ip` and `userAgent` settings: Microsoft Ads (Bing) Conversions API requests
now send the client IP and user agent as `userData.clientIpAddress` and
`userData.clientUserAgent` by default, read from `ingest.ip`/`ingest.userAgent`
or `user.ip`/`user.userAgent`. A mapped value still wins. Set either setting to
`false` to opt out.
