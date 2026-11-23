---
'@walkeros/server-destination-matomo': patch
---

New Matomo server destination for the HTTP Tracking API: page views, events,
goals, site search and ecommerce from walker.js events, with the visitor ID
derived from the device ID. It sends the visitor's IP, user agent and user ID
only when you set them, needs a token for the IP and for events older than a
day, and can pick the site ID and tracker URL per event, so one step serves
several sites. A request Matomo refuses fails the push instead of counting as
delivered.
