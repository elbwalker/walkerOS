---
'@walkeros/web-core': patch
---

The global `Window.elbLayer` type is now optional, matching reality: the queue
is absent until a source initializes it (the runtime already guards for this).
Code that reads `window.elbLayer` directly now correctly narrows it as possibly
undefined.
