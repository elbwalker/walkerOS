---
'@walkeros/server-destination-aws': patch
---

Failures are reported with the AWS error name as code, the HTTP status and a
correct retryable flag, so a missing stream, denied access or missing
credentials is no longer retried. Messages name the stream or topic, region and
fix, not AWS's text. Settings schemas require a stream name (Firehose) or topic
ARN or name (SNS).
