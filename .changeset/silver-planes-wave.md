---
'@walkeros/cli': patch
---

Add transformer support to CLI bundler

- Detect and bundle transformer packages from flow.json configuration
- Support transformer chaining via `next` field
- Handle `$code:` prefix for inline JavaScript in transformer config
- Generate proper import statements and config objects for transformers
- Document transformer configuration in flow.json
