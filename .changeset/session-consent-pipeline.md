---
'@walkeros/web-source-session': patch
---

A session source that waits for consent now issues its `session start` event and
its `user` and `session` commands through its own source interface, so the event
runs through the source's `next` and `before` chains and mapping, as without a
consent gate. A custom `cb` now gets that `{ push, command }` interface, not the
collector.
