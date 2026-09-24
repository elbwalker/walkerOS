---
'@walkeros/core': minor
'@walkeros/collector': patch
'@walkeros/web-core': patch
'@walkeros/server-store-sheets': patch
'@walkeros/server-store-gcs': patch
'@walkeros/server-store-s3': patch
'@walkeros/server-destination-datamanager': patch
'@walkeros/server-destination-gcp': minor
'@walkeros/server-destination-aws': patch
'@walkeros/server-destination-api': patch
'@walkeros/server-destination-clickhouse': patch
'@walkeros/server-destination-hubspot': patch
'@walkeros/server-destination-kafka': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-destination-redis': patch
'@walkeros/server-destination-sqlite': patch
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-transformer-file': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-optimizely': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-tiktok': patch
---

Simulate now records every destination's vendor call, including calls through
SDK clients built by constructors or async factories, via one recorder,
`observeEnv` from `@walkeros/core`. BigQuery, Data Manager and the Sheets, GCS
and S3 stores reach the network through `env`, so simulate runs offline. The
async `expectSimulationResolves` (`@walkeros/core/dev`) pins a package's
simulation paths.
