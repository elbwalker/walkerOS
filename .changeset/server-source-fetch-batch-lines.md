---
'@walkeros/server-source-fetch': patch
---

A per-event "not processed" answer in a batch logs at DEBUG, because the
collector's ERROR line is the signal. A push that throws inside a batch logs an
ERROR and answers `Internal server error`, never the error text.
