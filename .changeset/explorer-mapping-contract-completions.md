---
'@walkeros/explorer': patch
---

Export `getMappingPathCompletions` and `getContractCompletions` so custom form
inputs can seed contract-driven path and `$contract` reference suggestions
outside Monaco. Add `allowedRefKinds` (the cursor-scoped `$`-ref gate, now
covering `$contract`) and `getJsonPathAtOffset`, and gate the open `$`
completion fallback by the same scope rule so Monaco offers only the ref kinds
valid at the cursor.
