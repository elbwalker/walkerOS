---
'@walkeros/server-store-api': patch
---

New read-only store for third-party HTTP APIs. Each key is one GET to a URL
template with a `{key}` placeholder, with an optional bearer token. A 404, a 204
or a `null` body is a miss and every other failure is reported at `ERROR`. Pair
it with the store cache to cut repeated requests.
