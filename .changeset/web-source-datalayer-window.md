---
'@walkeros/web-source-datalayer': patch
---

Works without an injected `window`: the source reads the page's own, so the
documented integration captures `dataLayer.push` calls in integrated and bundled
mode alike, with no `env` needed. In tests, `env.window` replaces it.
