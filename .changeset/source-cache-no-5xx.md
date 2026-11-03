---
'@walkeros/collector': patch
---

The source cache no longer keeps a 5xx answer. A short store failure behind a
cached route is no longer served for the whole cache time. A 404 or 200 answer
is still cached for the ttl.
