---
'@walkeros/server-destination-redis': patch
---

A failed XADD fails the push and lands in the dead-letter queue instead of being
logged and counted delivered. Connection errors are reported through the
collector, and shutdown no longer waits on a disconnected client. Rules with
`silent: true` append nothing.
