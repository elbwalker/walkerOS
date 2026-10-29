---
'@walkeros/server-destination-datamanager': patch
---

The Data Manager settings `batchSize` and `batchInterval` now say they have no
effect: every event is sent in its own request. The `consent` description now
says that request-level consent applies to each event without consent of its
own, and the `credentials`, `userData`, `destinations` and
`productDestinationId` descriptions are corrected. They appear in the docs
settings table and in MCP `package_get`.
