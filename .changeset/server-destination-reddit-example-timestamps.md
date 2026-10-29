---
'@walkeros/server-destination-reddit': patch
---

The step examples carry event timestamps in milliseconds, as the walkerOS event
model defines them, so the published requests show a realistic `event_at`
instead of a date in 1970. The `action_source` description says the setting has
no effect, and the `url` description says the custom base URL must end in `/`.
