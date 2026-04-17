---
'@walkeros/cli': minor
---

Add `target` option to `bundle()`:
`cdn | cdn-skeleton | runner | simulate | push`. Replaces
`buildOverrides.skipWrapper` (deprecated) to stop dev schemas leaking into
production CDN bundles. Stage 2 entry generators gain `platform` option and
inject `env.window`/`env.document` for browser targets, fixing `window.elbLayer`
in deployed walker.js.
