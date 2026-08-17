---
'@walkeros/walker.js': minor
---

The top-level `run` flag now reaches the collector. Setting `run: false`, in
`window.elbConfig` or inline via `data-elbconfig="run:false"`, previously had no
effect and the collector started anyway. It now holds the collector until you
send `walker run` yourself.
