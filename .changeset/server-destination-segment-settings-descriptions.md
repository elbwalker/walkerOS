---
'@walkeros/server-destination-segment': patch
---

The `identify` and `group` descriptions now say that a call is skipped when its
userId (or groupId) and traits match the previous call of that kind; the
anonymousId and the user are not compared. The `integrations` description says
that the setting has no effect. Example timestamps are in milliseconds.
