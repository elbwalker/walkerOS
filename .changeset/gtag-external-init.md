---
'@walkeros/web-destination-gtag': minor
---

The `js` command is no longer sent when gtag already exists. It announces that
gtag initialised, so sending a second one after a tag manager has already
bootstrapped gtag asserts a false, later initialisation time. walkerOS now sends
it only when it bootstraps gtag itself.

Added `ga4.init` for the stronger case: set it to `false` when your container
already configures the measurement ID, and walkerOS skips `js`, `config` and the
script load entirely, sending only events.
