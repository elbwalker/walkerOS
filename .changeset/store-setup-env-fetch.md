---
'@walkeros/server-store-gcs': patch
'@walkeros/server-store-sheets': patch
---

The GCS and Sheets store `setup` now makes every request, including the token
exchange, through the `fetch` in the store's env when one is given, so setup can
be tested and simulated without reaching Google.
