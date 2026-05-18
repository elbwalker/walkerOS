---
'@walkeros/core': minor
'@walkeros/collector': patch
---

`Status.dropped` is now keyed by stepId, so operators can see at a glance which
step dropped events. Read with `status.dropped["collector"]?.queue` or
`status.dropped["destination.<id>"]?.queue` / `.dlq`, or build the key with the
new `stepId()` helper exported from `@walkeros/core`. Breaking change: the
previous flat shape (`status.dropped.queue` / `.queuePush` / `.dlq`) and the
per-destination `dropped` field on `DestinationStatus` are removed.
