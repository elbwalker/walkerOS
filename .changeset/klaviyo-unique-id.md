---
'@walkeros/server-destination-klaviyo': patch
---

Events now carry Klaviyo's `unique_id` dedup key, defaulting to the walkerOS
event id. Klaviyo previously fell back to the event time truncated to the
second, which dropped distinct events for one profile and metric inside the same
second. Map `settings.uniqueId` on the destination or on a mapping rule to
deduplicate on a business identifier instead.
