---
'@walkeros/collector': patch
---

`conformance` from `@walkeros/collector/dev` now checks the minimal example of
every destination. Pass `minimal` (the package's `examples.minimal`, published
from `src/examples/minimal.ts`), or `withoutMinimal` with the reason the package
publishes none. A destination's conformance test that does neither fails until
it adds one of the two.
