---
'@walkeros/server-store-fs': patch
---

A path that is a directory is a miss, like a missing file, instead of a failed
read. A read that fails for another reason, such as a permission error, still
throws and is reported by the collector.
