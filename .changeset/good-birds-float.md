---
'@walkeros/cli': patch
---

Fix chain property handling for all component types in bundler. Sources now
correctly output `next` property for pre-collector transformer chains. Unified
inline code generation for sources, destinations, and transformers. Standardized
transformer `next` as top-level property (consistent with destination `before`).
