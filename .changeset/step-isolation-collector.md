---
'@walkeros/collector': patch
---

Add a per-destination circuit breaker that skips a destination after consecutive
transport failures and probes once after a cooldown, so a persistently failing
destination stops retrying on every event. Out-of-band `reportError` calls are
routed to the dead-letter queue (when an event is in hand) or counted as
connection errors and surfaced in status.
