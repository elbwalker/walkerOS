---
'@walkeros/web-destination-optimizely': patch
---

The `eventKey` rule setting is described as having no effect: Optimizely
receives the rule's `name` or the event name. The `attributes` description says
the user context, and with it the attributes, is created again whenever the user
ID differs from the previous event's.
