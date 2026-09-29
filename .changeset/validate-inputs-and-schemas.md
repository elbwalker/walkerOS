---
'@walkeros/cli': minor
'@walkeros/core': patch
'@walkeros/web-source-cmp-usercentrics': patch
---

`walkeros validate` reports a missing or non-JSON input file as an input error
(exit 3). `--path` no longer fails on `uri` or email formats, nor warns on
mapping loops. The published Flow JSON Schema adds `config.observe` and drops
step-level `validate`. The Usercentrics schema now lists `apiVersion` and
`v3EventName`.
