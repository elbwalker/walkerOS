---
'@walkeros/server-destination-mparticle': minor
---

Add server-side mParticle CDP destination. Events are packaged into batches and
POSTed to the regional mParticle pod via the HTTP Events API using Basic auth
(apiKey / apiSecret). Supports user identities, user attributes, consent state,
pod selection, and environment targeting.
