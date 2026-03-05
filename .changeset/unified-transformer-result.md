---
'@walkeros/core': patch
'@walkeros/collector': patch
'@walkeros/transformer-demo': patch
'@walkeros/transformer-validator': patch
'@walkeros/transformer-router': patch
'@walkeros/server-transformer-fingerprint': patch
---

Replace union transformer return type with unified `Transformer.Result` object.
Transformers now return `{ event }` instead of naked events, and can optionally
include `respond` (for wrapping) or `next` (for branching). The `BranchResult`
type and `__branch` discriminant are removed.
