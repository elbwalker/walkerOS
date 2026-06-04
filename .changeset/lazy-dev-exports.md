---
'@walkeros/cli': patch
---

Bundle skeletons now expose each package's dev exports through a lazy loader.
Production deploy bundles drop it entirely, so a shipped `walker.js` never
carries the dev schema graph, while in-process simulate and push inline the dev
exports so they resolve on a minimal runtime without the source packages
installed alongside. This fixes a browser deploy bundle that could fail to build
or retain dev schemas, and web simulation that could not find the dev exports.
