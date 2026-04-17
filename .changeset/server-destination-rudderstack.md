---
'@walkeros/server-destination-rudderstack': minor
---

Add server-side RudderStack CDP destination with full Segment Spec support
(Track, Identify, Group, Page, Screen, Alias) via @rudderstack/rudder-sdk-node
SDK. Includes graceful shutdown via flush(), identity resolution per-call, alias
support for identity merging, and state diffing for identify/group.
