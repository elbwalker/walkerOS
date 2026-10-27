---
'@walkeros/cli': patch
'@walkeros/core': patch
'@walkeros/server-destination-amplitude': patch
'@walkeros/server-destination-meta': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/server-destination-pinterest': patch
'@walkeros/server-destination-piwikpro': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-destination-reddit': patch
'@walkeros/server-destination-slack': patch
'@walkeros/web-destination-amplitude': patch
'@walkeros/web-destination-api': patch
'@walkeros/web-destination-clarity': patch
'@walkeros/web-destination-d8a': patch
'@walkeros/web-destination-fullstory': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-heap': patch
'@walkeros/web-destination-linkedin': patch
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-meta': patch
'@walkeros/web-destination-mixpanel': patch
'@walkeros/web-destination-piano': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-posthog': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-tiktok': patch
---

The sample events from `getEvent` now use the standard event names:
`checkout start` replaces `checkout view`, an order carries `tax` and `total`, a
promotion names its placement `slot`, and product events carry `currency`. Order
`value` is now the merchandise value: the `order complete` sample goes from 555
to 462, and the gross amount charged is `total` (467.22). The destination
examples read `data.tax`, `data.slot` and the search keys `data.term` and
`data.results`, and gross fields such as Matomo `grandTotal` read `data.total`
first, then `data.value`. The CLI ships default event contracts for common site
types in `examples/contracts/`.
