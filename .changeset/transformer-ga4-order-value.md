---
'@walkeros/transformer-ga4': patch
---

GA4 `purchase` and `refund` hits now decode the order amount into `data.value`
instead of `data.total`, matching the standard `order complete` event. A mapping
that reads `data.total` from these events must read `data.value` now.
