---
'@walkeros/core': patch
---

Fixed journey assembly dropping records when several runtime instances (page
reloads, container restarts) reported overlapping sequence numbers. Every
instance's records now survive into journeys and gap detection stays truthful.
Each journey hop also carries the `release` of the runtime that produced it.
