---
'@walkeros/server-source-express': patch
'@walkeros/server-source-gcp': patch
---

Fix events being silently dropped when posted via `navigator.sendBeacon`. The
browser forces `Content-Type: text/plain;charset=UTF-8` for beacon requests even
when the payload is JSON, which previously caused the express middleware to skip
body parsing and the GCP Cloud Functions handler to treat the body as an opaque
string, both falling through to an empty-event push. Express now accepts
`text/plain` bodies through `express.json()`, and the Cloud Functions handler
attempts `JSON.parse` on string bodies before classifying the request.
