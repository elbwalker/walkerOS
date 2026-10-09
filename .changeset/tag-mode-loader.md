---
'@walkeros/core': patch
'@walkeros/cli': patch
'@walkeros/walker.js': patch
---

walker.js and every web bundle the CLI builds now carry the Tag Mode loader,
`moin()` from `@walkeros/core`. It stays idle unless the walkerOS app opens your
page for Tag Mode (`?elbMoin`), then loads the Tag Mode script from
`cdn.walkeros.io`. Without that host in your CSP's `script-src`, it loads
nothing (a `'strict-dynamic'` policy admits it through walker.js's nonce).
