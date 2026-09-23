---
'@walkeros/web-source-session': patch
---

Session detection no longer throws when the browser or an embedded webview has
no Navigation Timing entry. A missing entry now counts as "not a plain
navigation", so the known session is kept instead of the source failing.
