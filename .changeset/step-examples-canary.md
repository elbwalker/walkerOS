---
'@walkeros/core': minor
'@walkeros/web-destination-gtag': minor
---

Introduce the standardized `StepExample.out` shape: `[callable, ...args][]`
where each tuple is a function call (first element is the callable name) or a
`['return', value]` tuple for transformer-style returns. Every effect is
self-describing; docs and tools can render it uniformly without a per-package
registry.

Ship the shared `formatOut` renderer from `@walkeros/core` for docs + app. Also
exports `StepEffect` and `StepOut` types. Migrate
`@walkeros/web-destination-gtag` to the new shape as the canary — its multi-tool
outputs (GA4 + Ads + GTM) now flatten into a single array of `gtag(...)` and
`dataLayer.push(...)` tuples in observed execution order. Remaining destination
packages ship the old shape until the bulk migration (separate plan).
