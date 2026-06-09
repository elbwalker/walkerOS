---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/server-destination-gcp': patch
---

Batched destination delivery now reports failures. A batch push that fails
(including BigQuery row errors) is routed to the dead-letter buffer and counted
as failed instead of being silently dropped, and graceful shutdown waits for
in-flight batches to finish. Also fixes a shutdown timer that could delay
process exit, and makes a zero millisecond batch wait (`batch: 0`) correctly
enable batching.
