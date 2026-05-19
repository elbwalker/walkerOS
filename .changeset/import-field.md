---
'@walkeros/core': minor
'@walkeros/cli': minor
'@walkeros/collector': minor
'@walkeros/mcp': minor
---

**Breaking:** `code: "<exportName>"` is no longer accepted on any step. Replace
with `import: "<exportName>"` alongside `package`.

**New:** Every step (source, transformer, destination, store) accepts
`import?: string`. With `package`, it selects a named export. `package` alone
still loads the default export. Inline code stays
`code: { push, type?, init? }`. Empty steps are valid no-ops. `flow_validate`
and the CLI bundler raise `OBSOLETE_CODE_STRING` on the legacy shape with a
precise rename hint.
