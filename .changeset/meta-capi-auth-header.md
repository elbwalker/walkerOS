---
'@walkeros/server-destination-meta': patch
---

Send the Conversions API access token in an `Authorization: Bearer` header
instead of the URL query string, so the credential no longer appears in server,
proxy, or APM request logs.
