---
'@walkeros/runner': patch
'@walkeros/server-core': patch
'@walkeros/core': patch
---

`runneros remote` takes releases from the walkerOS app with the runner's
credential, keeps their secret values sealed in its cache and signs its flow's
ingest writes through the supervisor. `runneros start` no longer reads
`WALKEROS_FLOW_RELEASE` or `WALKEROS_FLOW_NAME`, since a remote release checks
its artifact's sha256 before any code runs.
