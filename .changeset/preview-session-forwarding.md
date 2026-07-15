---
'@walkeros/core': minor
'@walkeros/cli': minor
---

Observe-session activation URLs now carry a companion session-forwarding grant
(`elbPreviewSession`). The browser activator stores it alongside the activation
grant, and seamed preview bundles use it to forward events to the session
container — so one preview link shows web and server journeys together.
