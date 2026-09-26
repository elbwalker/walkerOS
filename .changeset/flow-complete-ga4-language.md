---
'@walkeros/cli': patch
---

In the flow-complete example, GA4 hits decoded on the server now get a page
language derived from the browser language (`en-us` becomes `en`, `na` when the
hit has none). With analytics consent they pass the example's contract and reach
Meta, Piwik PRO and Data Manager like any other event, not only the warehouse.
