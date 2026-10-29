---
'@walkeros/server-destination-amplitude': patch
---

The step examples that depend on destination config now name it in their
descriptions (`settings.identify`, `settings.eventOptions`, `include` and
`consent`), and their timestamps are in milliseconds. The `optOut` description
now says that each event the destination receives then fails with a transport
error.
