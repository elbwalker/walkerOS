---
'@walkeros/cli': minor
'@walkeros/mcp': patch
'@walkeros/core': minor
---

`walkeros push --simulate` prints each step's mapping and vendor calls
(`formatPushResult`); `--json` returns them under `simulations`. A destination
failing to initialize or push is now reported as a failure with its error. New
`--ingest` sets the request context; a programmatic `ingest` on a real push or
source simulate errors. `toPrintable` is exported from `@walkeros/core/node`.
