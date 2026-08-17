---
'@walkeros/web-destination-gtag': patch
---

Fixed gtag.js failing to load when `server_container_url` was set, which
requested the script from the server container and was rejected. First-party
loading now uses the new `ga4.scriptSrc` setting, pointing at the tag serving
path configured in your server container, and falls back to googletagmanager.com
if that script fails to load.
