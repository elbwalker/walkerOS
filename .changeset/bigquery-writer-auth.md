---
'@walkeros/server-destination-gcp': patch
---

The BigQuery Storage Write API data plane now authenticates from
`settings.bigquery` (e.g. `keyFilename`, `credentials`) instead of always
falling back to Application Default Credentials. Service-account auth configured
for setup now also applies to event ingestion.
