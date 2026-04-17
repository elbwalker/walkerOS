---
'@walkeros/server-destination-klaviyo': minor
---

Add server-side Klaviyo marketing automation destination with event tracking via
EventsApi.createEvent() and profile management via
ProfilesApi.createOrUpdateProfile(). Supports revenue tracking with
value/valueCurrency, ecommerce metric name mapping, and identify state diffing
to avoid redundant upserts.
