---
'@walkeros/server-destination-bing': minor
'@walkeros/server-destination-criteo': minor
'@walkeros/server-destination-datamanager': minor
'@walkeros/server-destination-meta': minor
'@walkeros/server-destination-pinterest': minor
'@walkeros/server-destination-reddit': minor
'@walkeros/server-destination-snapchat': minor
'@walkeros/server-destination-tiktok': minor
'@walkeros/server-destination-twitter': minor
---

New `ip` and `userAgent` settings on the Meta, Pinterest, Snapchat, TikTok,
Reddit, X (Twitter), Bing, Criteo and Google Data Manager server destinations.
Requests now send the client IP and user agent in each vendor's field by
default, read from `ingest.ip`/`ingest.userAgent` or `user.ip`/`user.userAgent`.
A mapped value still wins; set either setting to `false` to opt out.
