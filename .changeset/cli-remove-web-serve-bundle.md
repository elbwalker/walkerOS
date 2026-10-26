---
'@walkeros/cli': patch
---

The package no longer ships `examples/web-serve.js`, a stale prebuilt bundle
that still sent the old `order complete` shape, nor `examples/test.html`, the
page that loaded it. Build the browser example yourself with
`walkeros bundle examples/web-serve.json`, as the examples README shows.
