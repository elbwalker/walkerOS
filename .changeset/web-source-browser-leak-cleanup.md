---
'@walkeros/web-source-browser': patch
---

The browser source now releases its DOM event listeners, pulse intervals, and
wait timeouts when the source is destroyed. This prevents memory growth and
avoids duplicate events when the source is torn down or re-initialized.
