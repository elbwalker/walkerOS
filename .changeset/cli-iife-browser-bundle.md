---
'@walkeros/cli': patch
---

Browser flow bundles are now emitted as an IIFE so all internal code stays
inside a private scope. Previously the bundled helper functions could leak onto
the global `window` object and collide with other scripts on the page, such as
Google Analytics or a consent manager. Server bundles are unchanged and still
emit ESM.
