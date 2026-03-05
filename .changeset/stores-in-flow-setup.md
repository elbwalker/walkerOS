---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/store-memory': minor
'@walkeros/server-transformer-cache': patch
'@walkeros/server-transformer-file': patch
'@walkeros/cli': minor
---

Add stores as a first-class component type in Flow.Setup. Stores get their own
`stores` section in flow config, a `collector.stores` registry, and
`$store:storeId` env wiring in the bundler. Includes `storeMemoryInit` for
Flow.Setup compatibility and type widening in cache/file transformers.
