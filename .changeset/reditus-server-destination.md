---
'@walkeros/server-destination-reditus': minor
---

New Reditus server destination for affiliate and referral programs. Each rule
sends a referral conversion (`POST /v2/tracking/conversion`, with `gr_id` or an
affiliate/advocate slug) or a payment (`POST /v1/payments`, amount in cents,
idempotent on the event id). An existing referral (409) or a customer who was
never referred (404) counts as delivered.
