---
'@walkeros/web-source-browser': patch
---

Fix a case where a `visible` / `impression` trigger could still fire shortly
after the source or its scope was destroyed. Pending visibility timers are now
cancelled during teardown.
