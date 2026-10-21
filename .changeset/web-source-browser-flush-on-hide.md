---
'@walkeros/web-source-browser': patch
---

New: the source sends `walker flush` when the page goes away (`pagehide`, or the
document turning hidden), so batched events are delivered. A failing `elbLayer`
entry now logs one ERROR naming its event, never its data, and counts as failed.
