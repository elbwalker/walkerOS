---
'@walkeros/server-destination-segment': patch
'@walkeros/server-destination-rudderstack': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-destination-amplitude': patch
---

Retries stay inside the destination's `config.timeout`: a quarter of it per
attempt, at most two retries, and a value set in the settings wins. RudderStack
gains a `timeout` setting. Events carry `event.id` as the vendor's dedup id
(PostHog on `capture` only), so at-least-once delivery drops duplicates.
