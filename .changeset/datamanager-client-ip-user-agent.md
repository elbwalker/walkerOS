---
'@walkeros/server-destination-datamanager': minor
---

New `ip` and `userAgent` settings: Google Data Manager requests now send the
client IP and user agent as `eventDeviceInfo.ipAddress` and
`eventDeviceInfo.userAgent` by default, read from `ingest.ip`/`ingest.userAgent`
or `user.ip`/`user.userAgent`. A mapped value still wins. Set either setting to
`false` to opt out.
