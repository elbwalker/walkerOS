---
'@walkeros/cli': patch
---

Fix URL handling in resolveAsset - URLs are now passed through unchanged instead
of being mangled into invalid filesystem paths
