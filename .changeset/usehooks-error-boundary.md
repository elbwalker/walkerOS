---
'@walkeros/core': patch
'@walkeros/collector': patch
---

`useHooks` now isolates hook failures. A pre-hook that throws no longer crashes
the pipeline — the wrapped function is called directly and a warning is logged.
A post-hook that throws leaves the original result in place. Added optional 4th
`logger` parameter so warnings route through the walkerOS Logger (falls back to
`console.warn` when no logger is provided). All collector call sites now pass
`collector.logger`.
