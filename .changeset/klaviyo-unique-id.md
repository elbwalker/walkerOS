---
'@walkeros/server-destination-klaviyo': minor
---

Mapping rules accept `settings.uniqueId`, which resolves Klaviyo's `unique_id`
-- the key it deduplicates on, keeping only the first event with a given value
for one profile and metric. It matters wherever the same event can reach Klaviyo
twice: browser tracking running alongside this destination, a CSV or backfill
import, or a retried delivery. Without it Klaviyo dedups on the event time
truncated to the second, admitting one event per profile per metric per second.
Numeric ids are coerced to strings so a numeric order id resolves instead of
being dropped.
