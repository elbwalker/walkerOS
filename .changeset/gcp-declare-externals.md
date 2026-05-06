---
'@walkeros/server-destination-gcp': patch
---

Declare `@google-cloud/bigquery-storage` and its gRPC stack as bundle externals
via `walkerOS.bundle.external`. Fixes
`__dirname is not defined in ES module scope` when bundling a flow that uses
BigQuery Storage Write API. Requires `@walkeros/cli` >= the version shipping the
bundler-externals feature.
