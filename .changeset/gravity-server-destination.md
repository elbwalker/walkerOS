---
'@walkeros/server-destination-gravity': minor
---

New Gravity server destination for the Conversions API of ads in AI assistants.
The mapped event name is the Gravity event (standard or custom); email and phone
are normalised and SHA-256 hashed, the Gravity click parameters are passed
through, and an `error` status inside a 200 answer fails the push.
`test_event_code` validates events without recording them.
