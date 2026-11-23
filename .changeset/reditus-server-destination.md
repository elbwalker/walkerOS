---
'@walkeros/server-destination-reditus': minor
---

New Reditus server destination for affiliate and referral programs. Each rule
sends a referral conversion (`POST /v2/tracking/conversion`, with an affiliate
or advocate slug) or a payment (`POST /v1/payments`, amount in cents, keyed by
the payment processor's payment id). An existing referral (409), a payment
Reditus already has (400) or a customer who was never referred (404) counts as
delivered, and any other refusal fails the event.
