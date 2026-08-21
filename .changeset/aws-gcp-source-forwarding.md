---
'@walkeros/server-source-aws': patch
'@walkeros/server-source-gcp': patch
---

The AWS Lambda and GCP Cloud Functions sources now forward every field of the
incoming request body to the collector, not just `event`, `data`, `context`,
`user`, `globals`, and `consent`. Fields such as `source` (release and trace
provenance) ride through and accumulate across crossings, matching the Express
and Fetch sources; as with those sources, a client can also supply `id`,
`timestamp`, `consent`, `user`, and `source`, which the collector treats as
values rather than overriding. Both sources now accept `name` as the event-name
field, the walkerOS standard; `{"event": "..."}` keeps working as a legacy alias
and is removed at the next major.
