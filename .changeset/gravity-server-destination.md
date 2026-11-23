---
'@walkeros/server-destination-gravity': minor
---

New Gravity server destination for the Conversions API of ads in AI assistants.
The mapped event name is the Gravity event (standard or custom); the Gravity
pixel's user data and the click parameters are passed through unchanged, email,
phone and names are normalised and SHA-256 hashed, and an `error` status inside
a 200 answer fails the push. `test_event_code` validates events without
recording them.
