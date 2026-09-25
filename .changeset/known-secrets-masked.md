---
'@walkeros/core': minor
'@walkeros/cli': patch
---

The values of secrets a flow references are now masked wherever they appear in
simulate output, CLI logs and the flow logs of a real push, also inside JSON
strings. The runtime masks the secret values it fetches in its logs.
`scrubSecrets` accepts a `known` option and the CLI logger a `knownSecrets`
option.
