---
'@walkeros/server-destination-gcp': patch
---

BigQuery types are now structural: `Settings.client` is a `QueryClient`, the
writer handles are `WriteClient`, `RowWriter`, `WriteConnection` and
`ConnectionListener`, and `Env.BigQuery` builds a `QueryClient`. The real SDK
still fits all of them. An env that injects `WriterClient` without `JSONWriter`
now fails init with a clear error.
