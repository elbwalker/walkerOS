---
'@walkeros/transformer-ga4': patch
---

Each decoded GA4 event now gets its own event id. Before, every event from the
same page shared one id, so deduplicating on `event.id` dropped all but the
first. The id stays the same when a hit is delivered twice, so retries are still
deduplicated. `source` now also carries the raw GA4 `pageLoadId` and
`hitSequence`.
