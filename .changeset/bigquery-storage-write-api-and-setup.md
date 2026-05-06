---
'@walkeros/server-destination-gcp': patch
---

BigQuery destination: migrate from legacy tabledata.insertAll to the BigQuery
Storage Write API (~2x cheaper at volume, 2 TiB/month free tier), add the
`setup()` lifecycle for one-shot dataset and table provisioning via
`walkeros setup destination.bigquery`, and implement `pushBatch` so the
collector's `batch: <ms>` mapping setting actually batches into a single
appendRows call.

Breaking changes:

- The 15-column table schema is now using walkerOS event v4 schema.

Run `walkeros setup destination.bigquery` to provision the dataset and table
with day partitioning on `timestamp` and clustering on `(name, entity, action)`.
