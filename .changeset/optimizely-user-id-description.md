---
'@walkeros/web-destination-optimizely': patch
---

The `userId` description shows a working fallback, `["user.id", "user.device"]`,
instead of a `{ key, value }` form that sent the literal text `user.device` as
the user id of every anonymous visitor. The `attributes` description says the
attributes apply when the user context is created.
