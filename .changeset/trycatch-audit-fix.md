---
'@walkeros/collector': patch
'@walkeros/core': patch
---

Internal pipeline failures in mapping, source startup, transformer init, and
destination init now log via the scoped logger and increment
`collector.status.failed`. Previously silent. User-supplied callbacks (mapping
`condition`/`fn`/`validate`, `on` subscriptions) log on throw but do not affect
`status.failed`. A source whose `init()` throws now stays
`config.init === false` instead of being marked initialized.
