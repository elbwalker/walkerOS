---
'@walkeros/server-source-express': minor
---

Rewrite createTrigger to use real HTTP requests via fetch() instead of mocked
req/res. Follows unified Trigger.CreateFn interface. Step examples updated with
trigger metadata field.
