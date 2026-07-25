---
'@walkeros/web-destination-gtag': patch
---

The GA4 destination now loads gtag.js first-party from your server container.
When `server_container_url` is set and script loading is enabled, gtag.js is
fetched from `<server_container_url>/gtag/js` instead of googletagmanager.com.
Without a server container configured, loading is unchanged.
