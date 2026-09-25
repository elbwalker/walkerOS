---
'@walkeros/core': patch
'@walkeros/server-destination-amplitude': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/server-destination-file': patch
'@walkeros/server-destination-aws': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
---

Simulation records calls through frozen objects and no longer lists `init` for
Amplitude and Mixpanel. The file destination records its writes, and the SQS and
Pub/Sub pull sources ship mock clients. Firehose, PostHog, SQS and Pub/Sub pull
`Env` and `client` types are now structural; Pub/Sub pull setup accepts any
client with the admin methods it calls.
