---
'@walkeros/server-destination-aws': patch
---

The Firehose and SNS step examples carry event timestamps in milliseconds, as
the walkerOS event model defines them, so the published records and messages
show realistic dates. The delivery hint describes the dead letter queue without
promising a later replay.
