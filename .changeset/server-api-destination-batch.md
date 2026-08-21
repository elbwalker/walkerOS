---
'@walkeros/server-destination-api': minor
---

`config.batch` now works on the server API destination. It previously had no
`pushBatch`, which is the collector's gate for batching, so the setting was
accepted and silently ignored and every event was still sent as its own request.
A flush is now one request whose body is a JSON array of the batched events, one
element per event, mapped per event and passed through `transform` per element,
matching the web variant. `transform` is also declared in the settings schema
now, so it shows up in the package hints instead of being an undocumented
option.
