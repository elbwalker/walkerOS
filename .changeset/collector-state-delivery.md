---
'@walkeros/collector': minor
---

Consent and state-gated source reactions, such as the session source's session
start, now fire reliably regardless of source init order or whether the state
arrives before or after run. The collector enforces exactly-once delivery, so
sources no longer need their own deduplication.
