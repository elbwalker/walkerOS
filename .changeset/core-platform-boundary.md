---
'@walkeros/core': patch
---

Tag Mode's `moin` and the preview activator `browserSwapActivator` (with
`SwapActivatorConfig` and `SESSION_STORAGE_KEY`) moved to `@walkeros/web-core`,
and `isElementOrDocument` is removed. `serializeStoreValue`,
`deserializeStoreValue` and `StoreCodecError` moved to `@walkeros/core/node`.
`getFlowSettings` reads `$env` only from the `env` you pass it, never from
`process.env`. Errors keep `cause` in every browser.
