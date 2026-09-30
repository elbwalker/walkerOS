---
'@walkeros/web-source-session': minor
---

`user.session` is set only in storage mode, like `user.device`; the window
session id stays in the `session start` event's `data.id`. A consent-gated
session start now runs through the source's `next` and `before` chains and
mapping, and a custom `cb` gets `{ push, command }`. A missing Navigation Timing
entry no longer throws.
