---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/web-source-browser': patch
'@walkeros/web-source-datalayer': patch
---

Source lifecycle redesign: factory + eager `init` + collector-gated `on()`

Source factories must now be side-effect-free. The collector calls
`Instance.init()` on each source eagerly after all factories register. `require`
no longer gates code execution. It gates `on(type)` delivery (events queue in
`Instance.queueOn` until the source is started, then replay).
`collector.pending.sources` has been removed; per-source state lives on
`Source.Instance` (`queueOn`) and `Source.Config` (`init`, `require`).

Migration: any source factory with side effects (queue draining, walker command
emission, listener attachment) should move those into the returned Instance's
optional `init` method. Tests asserting on `collector.pending.sources` should
read `collector.sources[id]` and inspect `config.init` / `config.require`
instead.

Fixes the elbLayer queue replay clobbering fresh consent/user state,
late-activated sources missing `walker run`, and inter-source require chains
racing when a non-required source's init fired a state-mutating walker command
before later require-gated sources had been registered.
