---
'@walkeros/web-destination-piwikpro': patch
---

The Piwik PRO examples pass `{ currencyCode }` as the last argument of the
ecommerce methods, as the Piwik PRO JavaScript API documents, so an order is
booked in its own currency instead of the app default. The examples cover page
view, product view, product add and order complete, recorded as
`window._paq.push` calls.
