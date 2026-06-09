---
'@walkeros/web-source-browser': patch
---

The single-instance guard is now scoped to the window instead of the module, so
loading the tag more than once on the same page is inert rather than
re-initializing. A second load no longer re-binds DOM triggers, re-adopts the
event layer, or surfaces an error to the host page.
