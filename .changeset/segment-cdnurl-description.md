---
'@walkeros/web-destination-segment': patch
---

The `cdnURL` description now matches the behaviour: Analytics.js fetches its
settings from the host you set there, so a self-hosted proxy works. The
description no longer claims that the setting is ignored and that settings
always come from `https://cdn.segment.com`.
