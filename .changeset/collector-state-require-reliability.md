---
'@walkeros/collector': minor
---

Consent and state-gated source reactions, such as the session source's session
start, now fire reliably regardless of source init order or whether state
arrives before or after `run`. A source or destination with a `require` gate
activates from the collector's current recorded state no matter which source
provided it (such as a CMP applying consent). The collector delivers each state
change exactly once per subscriber, so sources no longer re-fire on repeat
notifications of the same state, and CMP and session sources read their initial
consent during `init()` so construction stays side-effect free.
