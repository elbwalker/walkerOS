---
'@walkeros/web-destination-mixpanel': patch
---

The `group` setting description now says it is resolved and sent with
`set_group` on every push, not at init. The step examples name the destination
config they rely on, the login example uses a millisecond timestamp, and a new
example covers the destination-level group.
