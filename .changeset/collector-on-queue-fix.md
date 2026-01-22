---
'@walkeros/collector': patch
'@walkeros/core': patch
---

Queue on() events until destination init completes

Destinations now receive `on('consent')` and other lifecycle events only after
`init()` has completed. Previously, `on()` was called before `init()`, requiring
workarounds like gtag's `initializeGtag()` call inside its `on()` handler.

Also renamed queue properties for clarity:

- `destination.queue` → `destination.queuePush`
- `destination.onQueue` → `destination.queueOn`
