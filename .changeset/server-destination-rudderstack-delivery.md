---
'@walkeros/server-destination-rudderstack': patch
---

Batches by default (`config.batch` 20 events or 10 seconds) through `pushBatch`;
each event's own send decides its outcome, so a failed send fails that event
instead of counting as delivered, and no longer causes an unhandled promise
rejection. An event without userId or anonymousId fails with `missing-input`.
