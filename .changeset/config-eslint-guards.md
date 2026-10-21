---
'@walkeros/config': patch
---

The lint rules `walkeros/await-send` and `walkeros/no-silent-return` are errors:
a send that is not awaited, or a bare `return` in a destination's `push` or
`pushBatch`, fails lint. ESM builds of server-only packages define `require`, so
their CommonJS SDKs load, and tests are no longer published.
