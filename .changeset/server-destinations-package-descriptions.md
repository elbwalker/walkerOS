---
'@walkeros/server-destination-api': patch
'@walkeros/server-destination-piwikpro': patch
'@walkeros/server-destination-segment': patch
'@walkeros/server-destination-hubspot': patch
---

Package descriptions and hints now match what the destinations do. The API
custom headers example names `settings.headers`. Piwik PRO's ingest hint warns
that behind a proxy `ip` is the proxy's address, and its examples use one app ID
placeholder. Segment lists the calls it sends, and HubSpot updates contacts
rather than upserting them.
