---
'@walkeros/server-destination-datamanager': patch
---

A 2xx Data Manager answer whose body is not a JSON object is reported as a
transport failure ("Data Manager answered with an unreadable body").
