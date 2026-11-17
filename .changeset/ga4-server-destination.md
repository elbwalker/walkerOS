---
'@walkeros/server-destination-ga4': minor
---

New GA4 Measurement Protocol server destination. Server events join the
visitor's GA4 session when the `_ga` client id and session id are mapped; an
event without a client id gets a stable one derived from its event id. Ad
signals follow the event's marketing consent, `timestamp_micros` is sent for
events under 72 hours, and invalid event names fail before any request.
