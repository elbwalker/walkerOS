---
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-optimizely': patch
---

An event that no rule maps fails with `missing-input` in Snowplow; add an
`ignore: true` rule for events you do not send. Optimizely fails events from
visitors without the configured `userId` with `missing-input` instead of
dropping them.
