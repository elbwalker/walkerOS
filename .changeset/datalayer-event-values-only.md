---
'@walkeros/web-source-datalayer': patch
---

The dataLayer source copies only event values: DOM elements such as
`gtm.element`, functions and other non-data values in a push are left out, and a
date arrives as its timestamp. The page's own `dataLayer.push` never fails
because of the source. A `name` key in a push stays in the event data instead of
replacing the event name.
