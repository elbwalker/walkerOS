---
'@walkeros/web-destination-matomo': patch
---

A page view rule with settings such as a goal now still tracks the page view,
and rule `data` replaces the title. Unmapped events are skipped with a warning.
Custom dimensions resolve per event and rule values no longer leak into later
hits. The `url` gets one trailing slash, and `siteId` and `url` are required
only with `loadScript`.
