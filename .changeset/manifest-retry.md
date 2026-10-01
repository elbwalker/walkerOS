---
'@walkeros/cli': patch
---

Manifest builds now survive short network blips: the manifest download, skeleton
downloads and uploads retry up to three times on network errors, timeouts, 5xx
and 429, while other statuses such as an expired link fail at once. Each retry
is logged, and errors name the cause, for example `fetch failed (ECONNRESET)` or
`HTTP 503`.
