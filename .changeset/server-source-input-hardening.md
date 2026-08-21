---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/server-source-express': patch
'@walkeros/server-source-fetch': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-source-aws': patch
---

Server sources answer rejected client input with 4xx JSON instead of unhandled
errors or 500s: unparseable bodies return 400 at the HTTP boundary, and invalid
events return 400 with the reason wherever the response is still open
(synchronous handling; in the express default respond-first mode the 200 ack has
already been sent, so the rejection surfaces as a warn and a counter instead)
(`push` resolves `{ok: false, invalid: true, error}`). Genuine pipeline failures
return 500 instead of `success: true`. Invalid input now counts on
`collector.status.sources.<id>.rejected` instead of inflating `status.failed`.
The express source no longer sends `X-Powered-By` and now sets
`X-Content-Type-Options: nosniff` on every response.
