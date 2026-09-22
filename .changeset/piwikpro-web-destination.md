---
'@walkeros/web-destination-piwikpro': minor
---

Adds custom dimensions and an `identified` setting for anonymous tracking. A
page view rule with goal settings now still tracks the page view, and goal
values are resolved before sending. Unmapped events are skipped with a warning
instead of being pushed to `_paq`. Link tracking starts after the first hit, and
`url` and `appId` are required only with `loadScript`.
