---
'@walkeros/core': patch
---

The `context` of `getMappingValue` now requires `collector` in its type
(`Mapping.ValueContext`), matching the runtime, which already threw without one.
