---
'@walkeros/mcp': minor
---

`observe_journeys` now passes the `unattributed` integrity summary through
alongside `journeys` and `gaps`, so an agent sees the records that could not be
attributed to any event rather than a silently short list. A non-empty array
means telemetry was lost; an absent one means there was nothing to report.
