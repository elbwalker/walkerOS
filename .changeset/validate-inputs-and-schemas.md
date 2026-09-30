---
'@walkeros/cli': minor
'@walkeros/core': patch
'@walkeros/web-source-cmp-usercentrics': patch
---

`walkeros validate` reports a missing or non-JSON input as exit 3, like
`--path`, `--flow` or `--offline` with a non-flow `-t`. Unknown keys on
destinations and stores warn (`UNKNOWN_KEY`), as does `@walkeros/store-memory`.
`--path` ignores `uri` and email formats. The Flow JSON Schema adds
`config.observe` and drops step-level `validate`; the Usercentrics schema lists
`apiVersion` and `v3EventName`.
