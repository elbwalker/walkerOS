---
'@walkeros/server-store-gcs': patch
'@walkeros/server-store-sheets': patch
'@walkeros/server-store-s3': patch
---

The GCS, Sheets and S3 store examples now reference their credentials with
`$secret.` instead of `$env.`. A missing secret stops the flow at startup with
`required secret "<NAME>" is not set`; a missing `$env` service account makes
the GCS and Sheets stores fall back to the metadata server credentials.
