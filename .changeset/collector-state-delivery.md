---
'@walkeros/collector': minor
---

Consent and state-gated source reactions, such as the session source's session
start, now fire reliably regardless of source init order or whether state
arrives before or after `run`. The collector delivers each state change exactly
once per subscriber, so sources no longer need to re-fire on repeat collector
notifications of the same state.
