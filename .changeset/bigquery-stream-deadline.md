---
'@walkeros/server-destination-gcp': patch
'@walkeros/collector': patch
'@walkeros/cli': patch
---

The BigQuery destination no longer applies `config.timeout` as a deadline on the
Storage Write API append stream, which killed healthy connections roughly every
ten seconds and caused reconnect churn, latency spikes, and intermittent 5xx
responses. Error logs now show the error's message, name and status code in CLI
output, and no longer include event payloads.
