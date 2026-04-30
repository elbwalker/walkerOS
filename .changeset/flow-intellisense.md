---
'@walkeros/explorer': minor
'@walkeros/core': patch
---

Add Monaco IntelliSense for `$flow.X` cross-flow references in `Code`/`CodeBox`.
Completion offers known sibling flow names from the parsed flow document, hover
describes the resolved target, decorations style matches the other reference
prefixes, and unknown flow names emit a warning marker. Re-export `REF_FLOW`
from `@walkeros/core` so consumers can build inline regex tooling without
reaching into the subpath.
