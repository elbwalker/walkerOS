---
'@walkeros/cli': minor
'@walkeros/server-source-express': minor
'@walkeros/server-source-fetch': minor
---

Runner-owned health server: The runner now provides /health and /ready endpoints
independently of flow sources. Express source's `status` setting and fetch
source's `healthPath` setting have been removed — health endpoints are no longer
source responsibilities.
