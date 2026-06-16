---
'@walkeros/cli': patch
---

The runner registers its process-error guards before startup and degrades its
readiness check after repeated out-of-band errors, so a wedged container is
recycled instead of silently hot-looping. Heartbeats now flush immediately on a
new error and on shutdown, persist errors to disk so a failure cause survives a
restart, and report their configured interval.
