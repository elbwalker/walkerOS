---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/server-destination-clickhouse': patch
'@walkeros/server-core': patch
'@walkeros/cli': patch
'@walkeros/runner': patch
---

A paired runner now signs its writes to walkerOS hosted ingest with its own
credential key, so a flow needs no ingest token: the usage report signs each
report when it names no token, and the ClickHouse destination signs each insert
when its settings set `signed: true`. Any other endpoint or ClickHouse keeps its
token or credentials as before and is never signed for.
