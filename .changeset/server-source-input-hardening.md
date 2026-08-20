---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/server-source-express': minor
'@walkeros/server-source-fetch': minor
'@walkeros/server-source-gcp': minor
'@walkeros/server-source-aws': minor
---

Server sources answer rejected client input with 4xx JSON instead of unhandled
errors or 500s: unparseable bodies and invalid events return 400 with the reason
(`push` resolves `{ok: false, invalid: true, error}`). Genuine pipeline failures
return 500 instead of `success: true`. Invalid input now counts on
`collector.status.sources.<id>.rejected` instead of inflating `status.failed`.
The express source no longer sends `X-Powered-By` and now sets
`X-Content-Type-Options: nosniff` on every response.
