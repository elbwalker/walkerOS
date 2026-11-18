---
'@walkeros/server-core': patch
---

Server-core gains the channel a runner uses to talk to the app: a conditional
GET with ETag, a JSON POST, capped streams that follow one redirect without
credentials, and a check-in loop with full-jitter back-off and Retry-After.
`ChannelError` names the failure and its hop.
