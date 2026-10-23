---
'@walkeros/web-destination-gtag': patch
---

The gtag examples show the GA4 recommended events for page view, product view,
product add and order complete, with the calls as `window.gtag` records them.
The GA4 init example sets `pageview: false`: without it, gtag sends its own
page_view on `config` and every walkerOS page view counts twice.
