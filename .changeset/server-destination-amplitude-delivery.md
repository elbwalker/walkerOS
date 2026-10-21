---
'@walkeros/server-destination-amplitude': patch
---

Batches by default (`config.batch` 200 events or 10 seconds) through
`pushBatch`; each event fails, with the status, when Amplitude does not answer
with 2xx, instead of counting as delivered. A single push waits for its answer
too.
