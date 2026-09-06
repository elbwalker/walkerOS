---
'@walkeros/server-transformer-bot': patch
---

Bot detection now names nine more uptime and synthetic monitoring services,
including Uptrends, Site24x7, Datadog Synthetics, New Relic Synthetics and
Better Stack. Their requests report as `monitor` with the product name instead
of generic automation, and several that previously passed as human traffic are
now flagged.
