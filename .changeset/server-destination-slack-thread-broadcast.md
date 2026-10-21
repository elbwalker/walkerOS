---
'@walkeros/server-destination-slack': patch
---

`reply_broadcast` is sent only together with a thread. A broadcast flag set on a
message that has no thread to reply to is no longer passed on to Slack, so the
message is posted as an ordinary message.
