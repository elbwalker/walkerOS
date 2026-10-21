---
'@walkeros/server-destination-kafka': patch
---

A send is retried only when kafkajs marks the error as retriable. Deterministic
failures, such as an unknown topic or a rejected message, are final and fail the
push once instead of being retried.
