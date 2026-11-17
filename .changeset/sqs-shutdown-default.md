---
'@walkeros/server-source-aws': patch
---

The SQS source now ends a waiting long poll at once on shutdown and waits at
most 5000 ms for messages in flight instead of 30000, so its close fits the
collector's 8 second shutdown and leaves time for the batch flush. A message not
yet deleted when it closes redelivers after its visibility timeout.
