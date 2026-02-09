---
'@walkeros/collector': patch
---

Fix transformer chain next property not being preserved during initialization

The `initTransformers` function was not calling `extractChainProperty` to merge
the definition-level `next` value into the transformer's config. This caused
`walkChain` to only resolve the first transformer in any chain, breaking
`destination.before` chains like
`filter -> fingerprint -> geo -> sessionEnricher`.
