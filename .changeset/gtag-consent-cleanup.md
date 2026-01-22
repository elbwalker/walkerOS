---
'@walkeros/web-destination-gtag': patch
---

Remove initializeGtag workaround from on() handler

The `on('consent')` handler no longer needs to call `initializeGtag()` as a
workaround. With the collector fix, `on()` is now guaranteed to run after
`init()` completes, so `window.gtag` is always available.
