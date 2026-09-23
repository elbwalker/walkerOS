---
'@walkeros/cli': minor
---

`walkeros validate` now reports unknown route targets as `UNKNOWN_ROUTE_TARGET`
errors and warns about entries after an unconditional `stop` and about arrays
that only pick the first match. `walkeros push --simulate collector.default`
runs enrichment plus `collector.next`, `--mock collector.next.<id>` mocks one of
its steps, and simulating a transformer now continues through its `next`.
