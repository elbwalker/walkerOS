---
'@walkeros/server-source-express': patch
---

The route `path` description now names the patterns Express 5 accepts,
`/api/:id` and `/api/*path`. A bare `/api/*`, which the old text suggested, is
rejected at startup because the wildcard has no parameter name. Only the
description text changed, not the route handling.
