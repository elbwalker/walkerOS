---
'@walkeros/collector': patch
---

`runExamples` and `conformance` from `@walkeros/collector/dev` always run every
example the way `walkerOS.json` publishes it: each function in the example runs
from its source text, without the module it was written in. A function that
needs an import fails the package test and names the example. The `published`
option is gone.
