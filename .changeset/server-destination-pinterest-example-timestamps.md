---
'@walkeros/server-destination-pinterest': patch
---

The step examples carry event timestamps in milliseconds, as the walkerOS event
model defines them, so the published requests show a realistic `event_time`
instead of a date in 1970. The `url` description says the custom base URL must
end in `/`, and the package's docs link points to its documentation page.
