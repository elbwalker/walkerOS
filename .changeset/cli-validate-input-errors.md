---
'@walkeros/cli': minor
---

`walkeros validate` now reports a file path that does not exist or does not
contain valid JSON as an input error with exit code 3, instead of validating the
path string and failing the schema with exit code 1. Cross-step example checks
now include an object `out`, such as a source example that produces a single
walkerOS event, so incompatible connections are reported as errors.
