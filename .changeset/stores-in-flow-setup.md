---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/store-memory': minor
'@walkeros/server-transformer-cache': patch
'@walkeros/server-transformer-file': patch
'@walkeros/cli': minor
---

Add stores as a first-class component type in Flow.Config. Stores get their own
`stores` section in flow settings, a `collector.stores` registry, and
`$store:storeId` env wiring in the bundler. Includes `storeMemoryInit` for
Flow.Config compatibility and type widening in cache/file transformers.
