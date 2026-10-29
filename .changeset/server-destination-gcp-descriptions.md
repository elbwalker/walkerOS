---
'@walkeros/server-destination-gcp': patch
---

The BigQuery `location` setting is described as not read: `walkeros setup`
creates the dataset in `config.setup.location`. The `client` description says it
serves setup only. The hints cover BigQuery authentication with
`config.credentials`, the default dataset `walkerOS`, the setup command and how
repeated failures are counted. The Pub/Sub default storage regions carry their
full names, and example timestamps are in milliseconds.
