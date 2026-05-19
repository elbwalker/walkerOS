---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/web-source-browser': minor
'@walkeros/web-source-session': patch
---

Walker commands `destination`, `hook`, and `on` now take a single Init object:
`elb('walker destination', { code, config })`,
`elb('walker hook', { name, fn })`, `elb('walker on', { type, rules })`. The
previous positional forms and the `{ push }` shorthand are removed; the
`options` argument is gone from `collector.command`, `addDestination`, and
`commonHandleCommand`.
