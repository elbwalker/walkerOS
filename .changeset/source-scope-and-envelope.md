---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/server-source-express': patch
'@walkeros/server-source-fetch': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
---

Server sources now share one request scope and one event envelope, so
`config.ingest` paths and POST body forms behave identically on Express, Fetch,
Lambda and Cloud Functions. Batches and bare arrays are accepted everywhere, and
a destination before-chain fan-out no longer drops all but the first event.
Breaking: AWS `requestContext.*` moves under `raw.*`, Express drops `protocol`
and `hostname`, and Fetch `{ fn }` header mappings become
`{ key: 'headers.*' }`. See the migration guide.
