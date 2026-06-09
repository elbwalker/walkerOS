---
'@walkeros/core': minor
'@walkeros/server-destination-gcp': minor
'@walkeros/server-store-sheets': minor
'@walkeros/server-store-gcs': minor
'@walkeros/server-source-gcp': minor
'@walkeros/server-destination-datamanager': minor
---

Add an optional, strictly-typed `config.credentials` field to destinations,
stores, and sources. Service-account credentials now configure under
`config.credentials`, validated per package and resolved from `$env`. The
package-specific `settings.credentials` still works but is deprecated, so move
credentials to `config.credentials`. The raw `settings.<sdk>` passthrough (e.g.
`settings.bigquery`) is unchanged.
