---
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-piwikpro': minor
---

Piwik PRO and Matomo web destinations: a page view rule with a goal still tracks
the page view, unmapped events are skipped with a warning, and `url` plus
`appId`/`siteId` are required only with `loadScript`. Piwik PRO adds custom
dimensions and an `identified` setting for cookieless tracking; Matomo
dimensions no longer leak into later hits.
