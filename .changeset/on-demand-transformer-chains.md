---
'@walkeros/collector': patch
'@walkeros/core': patch
---

Fix transformer chains computed on-demand instead of pre-computed

Transformer chains configured via `destination.before` now work correctly.
Previously, chains were pre-computed at initialization but the resolution
function was never called, causing `before` configuration to be silently
ignored.

**What changed:**

- Chains now compute at push time from `destination.config.before`
- Removed unused `collector.transformerChain` state
- Removed dead `resolveTransformerGraph()` function
- Dynamic destinations now support `before` property
