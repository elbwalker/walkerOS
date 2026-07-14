---
'@walkeros/core': minor
'@walkeros/cli': minor
---

Preview links are now app-signed and bound to your site's origin, verified
locally in the bundle with no server round trip. Bundles that support preview
activation import a new `browserSwapActivator` from `@walkeros/core`. The CLI
wrap step's `preview` option replaces `previewOrigin`/`previewScope`, and a new
`previewGrantTargets` option lets a preview forward its grant to server-bound
destinations too.
