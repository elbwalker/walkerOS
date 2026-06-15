---
'@walkeros/cli': patch
---

The managed flow runner now retries its bundle, config, and secret fetches on
transient failures (timeouts, network errors, 5xx) with bounded, jittered
backoff capped well inside the container health window, and the secret fetch is
now bounded by a timeout. A brief outage while a flow container starts no longer
hard-fails the run.
