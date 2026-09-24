---
'@walkeros/web-source-session': minor
---

`user.session` is now set only in storage mode, like `user.device`. In window
mode (no storage consent) it was set on the start page only and gone on the next
page load, which broke fallbacks such as `user.session` then `user.hash`. The
window session id stays available as `data.id` of the `session start` event.
