---
'@walkeros/web-source-browser': minor
---

Multiple browser sources now run in parallel on one page with isolated trigger,
element and visibility state, sharing only the DOM. The `elb` and `elbLayer`
names belong to their first claimant, and conflicts are logged instead of
silently disabling the source. `elb: false` installs no global. A page that
includes the bundle twice now collects every event twice, once per source.
`SourceBrowser.Context` now requires `registry`.
