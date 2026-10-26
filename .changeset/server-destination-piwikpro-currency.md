---
'@walkeros/server-destination-piwikpro': patch
---

The ecommerce methods send the `currencyCode` of their options argument as the
Tracking API `cur` parameter, so a web mapping with a currency works unchanged
on the server. Before, the currency was dropped and Piwik PRO booked the order
in the app's default currency. The examples now also show the client IP and user
agent.
