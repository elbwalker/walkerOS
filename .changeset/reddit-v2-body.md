---
'@walkeros/server-destination-reddit': patch
---

Send the Conversions API v2.0 body (`{ test_mode?, events }`) instead of the v3
`data` envelope, which v2.0 ignores. The user agent is sent as is
(`userAgent: false` keeps it out), identity fields are brought into Reddit's
canonical form per key before hashing (`phone_number` is hashed now too, and a
list under a hashed key is left out with an ERROR line), and the `action_source`
setting reaches Reddit. A 200 answer that does not count the event as processed,
such as `Successfully processed 0 conversion events.`, now fails the push.
