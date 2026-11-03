---
'@walkeros/core': patch
'@walkeros/server-destination-segment': patch
'@walkeros/server-destination-rudderstack': patch
---

The `breaker` description in the destination config now says which failures open
the breaker: retryable ones such as a network error, a timeout or a 429 or 5xx
answer, never any other 4xx, a missing setting or a runtime failure. The Segment
and RudderStack failure examples carry their event timestamps in milliseconds.
