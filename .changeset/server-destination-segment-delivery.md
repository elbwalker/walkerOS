---
'@walkeros/server-destination-segment': patch
---

Batches by default (`config.batch` 15 events or 10 seconds) through `pushBatch`;
each event's own delivery decides its outcome, so a failed delivery fails that
event and lands in the dead-letter queue instead of counting as delivered. An
event without userId or anonymousId fails with `missing-input`.
