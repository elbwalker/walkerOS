---
'@walkeros/web-destination-matomo': patch
---

A page view rule with a goal now still tracks the page view, and rule `data`
replaces the title. Unmapped events and goal IDs that are not positive integers
are skipped with a warning. Custom dimensions resolve per event without leaking
into later hits. The `url` gets one trailing slash, and `siteId` and `url` are
required only with `loadScript`.
