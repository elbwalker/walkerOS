---
'@walkeros/server-destination-api': patch
---

`settings.url` is required: without it the destination fails to start with a
`config` error. Requests run on `fetch`, and a request that fails, times out or
gets an error status is reported as a failed push.
