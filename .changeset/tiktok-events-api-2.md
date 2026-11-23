---
'@walkeros/server-destination-tiktok': patch
---

Send the Events API 2.0 body the `/open_api/v1.3/event/track/` endpoint expects
(`event_source`, `event_source_id`, and `user`, `page`, `event_time` in seconds
per event) instead of the 1.0 `pixel_code`/`context` body, which TikTok does not
record. `phone_number` is sent as `phone`; email, phone and external_id are
normalized before hashing, and a list is hashed item by item. `doNotHash` takes
only these keys, whose values must already be SHA-256 digests.
