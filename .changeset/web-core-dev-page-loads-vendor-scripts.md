---
'@walkeros/web-core': patch
---

The test page `page` from `@walkeros/web-core/dev` now answers each vendor
script a step inserts with `load`, as a browser does, so a destination that
waits for its script delivers in the examples runner and the conformance kit
instead of timing out. `failScripts` still fails those scripts on demand.
