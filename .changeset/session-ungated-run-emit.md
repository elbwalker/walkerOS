---
'@walkeros/web-source-session': patch
---

Fix `session start` being dropped when the collector starts with `run: false`
and no consent requirement. Without a consent rule the source emitted during
init, before the collector was allowed, so the event never reached destinations.
The emit now waits for the run lifecycle, matching the browser source's page
view timing, so it lands reliably once the collector runs.
