---
'@walkeros/cli': minor
'@walkeros/core': minor
'@walkeros/runner': minor
---

`walkeros run` is removed. Build with `walkeros bundle`, then start the artifact
with `runneros start dist/flow.mjs` from the new `@walkeros/runner` package,
which the `walkeros/flow` image now runs. The CLI no longer depends on
`express`, `cors` or `p-limit`. New `@walkeros/core/node` entry with the
Node-only logger, redaction and temp-path helpers.
