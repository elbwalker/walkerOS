---
'@walkeros/cli': patch
---

`walkeros deploy` now waits long enough to cover a full server deploy by
default, so a slow but healthy deploy is no longer aborted early and reported as
a failure. Each run sends a fresh idempotency key, so retrying after a failure
starts a new deploy instead of replaying the previous result. Failures print a
stable, machine-readable error code (with a `Retry-After` hint on rate limits),
and `deploy create` no longer prints an empty token placeholder.
