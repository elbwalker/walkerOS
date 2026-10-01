---
'@walkeros/cli': minor
'@walkeros/core': minor
'@walkeros/mcp': minor
'@walkeros/config': minor
'@walkeros/server-destination-gcp': minor
'@walkeros/server-destination-aws': minor
'@walkeros/server-source-gcp': minor
'@walkeros/server-source-aws': minor
---

Packages with several exports, such as the GCP and AWS sources and destinations,
now publish a settings schema per export. `walkeros validate` and MCP
`package_get` use the schema of the export a step imports. Pub/Sub, BigQuery,
SNS and SQS steps pinned to this release or later are checked instead of
skipped; older pins still report a skip.
