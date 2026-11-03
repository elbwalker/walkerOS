---
'@walkeros/collector': minor
---

The `minimal` check of `conformance` accepts a setting the schema leaves
optional when the step needs it under the minimal example's config, such as a
site ID that only `loadScript: true` requires. It starts the step without that
setting and keeps it only when `init` refuses with a `config` error.
