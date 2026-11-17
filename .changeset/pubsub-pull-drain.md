---
'@walkeros/server-source-gcp': patch
---

The Pub/Sub pull source now lets messages in flight finish on shutdown and nacks
what is left at `shutdownTimeoutMs`, so Pub/Sub redelivers them. The default is
5000 ms instead of 30000, to fit the collector's 8 second shutdown.
