---
'@walkeros/server-transformer-fingerprint': patch
'@walkeros/cli': patch
---

An `ip` input that is not one address, such as a forwarded chain, is now
reported as an error and left out of the hash, instead of a warning that said it
was empty. The event is still delivered. The complete example flow reads the
visitor IP from a header the proxy sets.
