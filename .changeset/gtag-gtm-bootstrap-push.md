---
'@walkeros/web-destination-gtag': minor
---

The GTM destination no longer pushes the `gtm.js` start event into the dataLayer
unless it loads the container itself. Set `loadScript: true` to have walkerOS
install GTM, start event included. Without it, walkerOS only pushes your mapped
events, so an existing container's triggers are left alone.
