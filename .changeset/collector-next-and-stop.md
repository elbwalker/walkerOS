---
'@walkeros/collector': minor
'@walkeros/core': minor
'@walkeros/explorer': minor
'@walkeros/mcp': patch
---

New `collector.next`: a transformer chain run once per event before the
destinations; a `stop` there drops it for all of them. Routes in every chain
field can drop an event with `{ stop: true }`, optionally gated by `match`. A
route `match` reads `{ ingest, event }` when the event reaches it. New
`getRouteGraph`; `getNextSteps(spec, root)` requires its root.
