---
'@walkeros/server-destination-file': minor
---

Add `@walkeros/server-destination-file`: local filesystem sink for walkerOS
server flows. Appends events to a file as JSONL (default), TSV, or CSV with
per-event filename resolution via the standard `Mapping.Value` DSL (tenant
sharding via `key`, daily rotation via `$code:` in `fn`). Opens one
`WriteStream` per resolved filename and keeps it open until `destroy()`. No
third-party SDK — uses `node:fs` built-ins.
