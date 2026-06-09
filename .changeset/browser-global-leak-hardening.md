---
'@walkeros/cli': patch
'@walkeros/web-source-browser': patch
'@walkeros/collector': patch
---

Harden browser flows against global-scope collisions. Browser bundles are now
emitted as an IIFE so internal helpers stay in a private scope instead of
leaking onto `window` and colliding with other scripts such as Google Analytics
or a consent manager; server bundles still emit ESM. The browser source's
single-instance guard is scoped to the window rather than the module, so loading
the tag twice on a page is inert and no longer re-binds triggers, re-adopts the
event layer, or surfaces an error. Collector lifecycle dispatch now fails closed
when reached with a non-collector argument (for example via a global name
collision), returning quietly instead of throwing.
