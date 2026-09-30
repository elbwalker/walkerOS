---
'@walkeros/server-transformer-fingerprint': patch
---

The fingerprint settings schema now accepts every mapping value its type allows
for `ip`, `userAgent`, `site` and `fields`: paths, value configs and fallback
lists such as `["event.source.url", "ingest.origin"]`. Configs using them no
longer get settings warnings from `walkeros validate`.
