---
'@walkeros/web-destination-piano': patch
---

With `loadScript: true`, `site` and `collectDomain` now reach the Piano SDK
reliably. Configuration is applied after the injected script loads, instead of
being silently skipped on a cold page. If the script fails to load (ad blocker,
network, CDN), a warning is logged rather than sending unconfigured events.
