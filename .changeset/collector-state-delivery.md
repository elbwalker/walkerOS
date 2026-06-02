---
'@walkeros/collector': minor
---

Consent and state-gated source reactions, such as the session source's session
start, now fire reliably regardless of source init order or whether the state
arrives before or after run. The collector enforces exactly-once delivery per
state change, so sources no longer need to deduplicate repeated deliveries of
the same state (they still control which upstream signals they turn into
commands).
