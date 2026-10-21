---
'@walkeros/server-store-fs': patch
'@walkeros/server-store-gcs': patch
'@walkeros/server-store-s3': patch
'@walkeros/server-store-sheets': patch
---

A read, write or delete that fails (403, 5xx, network) now throws instead of
looking like a missing key, and a stored value that cannot be decoded throws
too. The collector reports a failed read as a miss with one error line. S3 and
Sheets check their bucket or spreadsheet at the first operation instead of at
startup.
