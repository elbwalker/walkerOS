---
'@walkeros/core': minor
'@walkeros/cli': patch
---

The values of secrets a flow references are now masked wherever they appear in
simulate output and CLI logs, also inside JSON strings. `scrubSecrets` accepts a
`known` option and the CLI logger a `knownSecrets` option. Flow logs of a real
push and the runtime do not mask these values yet.
