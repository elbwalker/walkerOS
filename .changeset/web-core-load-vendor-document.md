---
'@walkeros/web-core': patch
---

`loadVendor` injects the script into the document that `env` provides, falling
back to the page's own, and fails with `vendor-not-ready` when there is no
document at all. The new `@walkeros/web-core/dev` entry exports
`mockScriptDocument()` for examples and tests that run without a browser.
