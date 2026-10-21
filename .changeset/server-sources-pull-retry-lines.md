---
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
---

A nack for a retryable failure logs at DEBUG, because the collector's ERROR line
reports the cause once per minute instead of one line per message. Transient
Pub/Sub stream errors and SQS receive errors that the SDK or loop retries log at
WARN instead of ERROR.
