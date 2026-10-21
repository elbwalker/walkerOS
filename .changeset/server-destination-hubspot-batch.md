---
'@walkeros/server-destination-hubspot': patch
---

`settings.batch` and `settings.batchSize` are removed: batch with the
destination's `config.batch`, which sends through HubSpot's batch API in chunks
of 500 and reports each event's own outcome. An event without email or objectId
fails with `missing-input`, and a failed HubSpot call fails the push with its
status.
