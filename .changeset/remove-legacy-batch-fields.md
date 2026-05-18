---
'@walkeros/core': patch
'@walkeros/explorer': patch
---

Remove unused legacy fields `batchFn` and `batched` from `Mapping.Rule`. Batch
state lives on the destination via `BatchRegistry`, never on mapping rules. No
runtime impact.
