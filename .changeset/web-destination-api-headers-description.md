---
'@walkeros/web-destination-api': patch
---

The `headers` setting no longer suggests an `Authorization: Bearer` token. Every
visitor's browser receives a web destination's config, so a header may carry a
public key but never a secret. To authenticate with a secret, send to your own
server endpoint and add the credential there.
