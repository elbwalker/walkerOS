---
'@walkeros/collector': patch
'@walkeros/core': patch
---

Promote chain, route shape, and reference scanner helpers to the public surface
so app and tooling can resolve transformer chains, probe route shapes, and
discover `$flow.` references without reaching into internal modules:

- collector: re-export `walkChain` (resolve a transformer chain start into the
  ordered step IDs) and `extractTransformerNextMap` (read static next-links from
  a `Transformer.Transformers` map).
- core: re-export `isRouteArray` and `isRouteConfigEntry` (the canonical shape
  probes for `Transformer.Route`) and add `scanFlowRefs(value, into?)`, which
  walks any value (string, object, array) and returns every `$flow.<name>`
  reference found, including refs nested inside `$code:` snippets.
