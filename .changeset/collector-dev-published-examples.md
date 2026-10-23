---
'@walkeros/collector': patch
---

`runExamples` from `@walkeros/collector/dev` takes `published: true` to run
every example as `walkerOS.json` publishes it: each mapping function as its
source text, evaluated without the module it was written in. A function that
needs an import then fails in the package test instead of in a copied flow.
