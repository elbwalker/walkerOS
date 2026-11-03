---
'@walkeros/cli': patch
---

The `flow-complete` example flow gains a `/demo/products/:id` lookup route that
serves product data from its file store, and a missing `walker.js` now answers
404 with `Cache-Control: no-store` instead of the tracking pixel.
