---
'@walkeros/server-source-gcp': patch
---

The Cloud Function and Pub/Sub push handlers now accept the request headers that
Express and the Functions Framework pass, where a header value may be undefined.
The typed handler from `Source.getSource` now plugs straight into `http()` from
the Functions Framework or an Express route, without a cast.
