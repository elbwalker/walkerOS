---
'@walkeros/server-destination-klaviyo': patch
'@walkeros/server-destination-customerio': patch
'@walkeros/server-destination-datamanager': patch
---

Failures carry the vendor's HTTP status, so a 4xx other than 429 is not retried
and a 429 or 5xx is. Data Manager's `settings.logLevel` is removed; it was never
read.
