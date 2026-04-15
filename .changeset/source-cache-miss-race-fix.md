---
'@walkeros/collector': patch
---

Fix race in source cache MISS wrapper: `applyUpdate` promise was
fire-and-forget, so a source fallback (e.g. express GIF default) could win
`createRespond`'s first-call-wins race on the first request. `wrappedPush` now
awaits the pending update before returning.
