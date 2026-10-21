---
'@walkeros/server-destination-gcp': patch
---

BigQuery opens its writer at the first push instead of at startup; a missing
dataset or table fails that push with the setup hint. BigQuery and Pub/Sub
failures are reported once by the collector instead of being logged twice, and
their messages name codes, not row data.
