---
'@walkeros/web-destination-matomo': patch
---

The ecommerce step examples are no longer published in the docs, and their
descriptions say they are test fixtures. Matomo needs an `addEcommerceItem` call
per product before a cart update, and before an order to record its products,
and tracks a product view as `setEcommerceView` followed by a page view. One
rule sends one command.
