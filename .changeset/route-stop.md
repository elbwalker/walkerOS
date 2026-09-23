---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Routes can drop an event with `{ stop: true }`, optionally gated by `match`, in
every chain field. A route `match` now reads `{ ingest, event }` and resolves
only when the event reaches it, so it sees values earlier steps loaded.
`getNextSteps(spec, root)` now requires that root and returns `NextSteps`; the
new `getRouteGraph` lists every branch.
