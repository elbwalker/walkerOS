---
'@walkeros/server-destination-gcp': patch
---

Add Pub/Sub sub-destination to the GCP server package. Publishes walkerOS events
to a Pub/Sub topic with optional per-key ordering and dynamic attributes, plus
idempotent topic provisioning via `walkeros setup destination.<id>`. EU region
default for at-rest storage. Three auth modes: ADC, service account JSON,
pre-configured client.
