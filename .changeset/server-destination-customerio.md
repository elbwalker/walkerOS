---
'@walkeros/server-destination-customerio': minor
---

Add server-side Customer.io destination with Track, Identify, Page View,
Transactional Messaging (sendEmail/sendPush), and Customer Lifecycle management
(destroy/suppress/merge) via customerio-node SDK. Auto-fallback to
trackAnonymous() for anonymous visitors, state-diffed identify to avoid
redundant calls.
