---
'@walkeros/core': patch
'@walkeros/cli': patch
---

Add inline code support for sources, transformers, and destinations

- Add `InlineCodeSchema` with `push`, `type`, and `init` fields for embedding
  JavaScript in flow configs
- Make `package` field optional in reference schemas (either `package` or `code`
  required at runtime)
- Update `flow-complete.json` example with inline code demonstrations including
  enricher transformer, debug destination, and conditional mappings
