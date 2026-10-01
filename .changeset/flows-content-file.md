---
'@walkeros/cli': patch
---

`walkeros flows create` and `walkeros flows update` now read `--content` from a
file path or URL as well as an inline JSON string. Large flows no longer need to
fit on the command line: pass `--content ./flow.json`.
