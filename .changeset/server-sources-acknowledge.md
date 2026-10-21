---
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-source-express': patch
'@walkeros/server-source-fetch': patch
---

A push that failed for a reason a resend cannot fix (a missing setting, a 4xx, a
destination that is not ready) is acknowledged: SQS deletes the message, Pub/Sub
acks it, HTTP sources answer 200. Only retryable failures nack or answer 500, or
207 for a batch, with the fixed text `Event was not processed`.
