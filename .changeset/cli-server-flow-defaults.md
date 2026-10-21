---
'@walkeros/cli': patch
---

Server flows skip consent-denied events by default
(`collector.consentDenied: 'skip'`; an authored value wins). A flow's own
`logger` level, format and handler apply under `runneros`. `walkeros setup`
fails with the reason when a step's `init` throws or returns `false`. Inline
`on`, `pushBatch` and `destroy` reach the bundle.
