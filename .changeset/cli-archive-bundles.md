---
'@walkeros/cli': minor
---

`walkeros run` now accepts a `.tar.gz`/`.tgz` flow archive (URL or local file):
it extracts the bundle and its `node_modules/` and runs it, so server flows with
external step packages resolve them at runtime. `walkeros bundle -o flow.tar.gz`
packs a server bundle directory into that archive. Web single-file bundles do
not support archive output.
