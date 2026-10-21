---
'@walkeros/collector': patch
---

A web Observe config takes `slot: pageObserveSlot()` from `@walkeros/web-core`;
without it one error line says so and Observe stays off. The conformance kit's
browser profiles take `page` from `@walkeros/web-core/dev`. Observed web bundles
need this CLI version.
