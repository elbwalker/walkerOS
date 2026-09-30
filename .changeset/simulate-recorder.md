---
'@walkeros/cli': minor
'@walkeros/collector': patch
'@walkeros/config': patch
'@walkeros/core': minor
'@walkeros/mcp': minor
'@walkeros/server-destination-amplitude': patch
'@walkeros/server-destination-api': patch
'@walkeros/server-destination-aws': patch
'@walkeros/server-destination-clickhouse': patch
'@walkeros/server-destination-datamanager': patch
'@walkeros/server-destination-file': patch
'@walkeros/server-destination-gcp': minor
'@walkeros/server-destination-hubspot': patch
'@walkeros/server-destination-kafka': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-destination-redis': patch
'@walkeros/server-destination-sqlite': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-store-gcs': patch
'@walkeros/server-store-s3': patch
'@walkeros/server-store-sheets': patch
'@walkeros/server-transformer-file': patch
'@walkeros/web-core': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-optimizely': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-tiktok': patch
---

Simulate records every vendor call through one recorder, `observeEnv` from
`@walkeros/core`, and runs offline: BigQuery, Data Manager and the Sheets, GCS
and S3 stores reach the network through `env`. Client and `Env` types of
BigQuery, Firehose, PostHog, SQS and Pub/Sub are structural. `@walkeros/cli`
exports `resolveExportName` and `selectDevExamples` and drops `findExample` and
`compareOutput`.
