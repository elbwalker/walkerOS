---
'@walkeros/web-source-browser': patch
---

Fix Shadow DOM support: use composedPath for event targets, recurse into open
shadow roots for element discovery and property collection
