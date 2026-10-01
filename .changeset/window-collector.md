---
'@walkeros/cli': minor
'@walkeros/core': minor
---

Web builds now assign the collector to the global named in
`config.settings.windowCollector`, default `walkerOS`. Before, `walkeros bundle`
ignored the setting. It accepts a name or a `$var`/`$env` reference; the
resolved name must be a valid, non-reserved JavaScript identifier, or the build
and `walkeros validate` report an error.
