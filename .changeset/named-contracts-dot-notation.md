---
'@walkeros/core': major
'@walkeros/transformer-validator': major
'@walkeros/cli': major
---

Replace flat/v2 contract format with named contracts supporting extends
inheritance.

BREAKING CHANGES:

- `contract` is now a map of named contract entries (e.g.,
  `{ "default": { ... }, "web": { ... } }`)
- `version` field inside contracts removed
- `$tagging` renamed to `tagging`
- Legacy flat contract format removed
- `$globals`, `$context`, `$custom`, `$user`, `$consent` references removed
- Settings-level `contract` field removed (use named contracts at config level)
- Auto-injection of `$tagging` into `collector.tagging` removed (use
  `$contract.name.tagging` explicitly)
- Validator `contract` setting renamed to `events` (receives raw schemas, not
  `{ schema: ... }` wrappers)

NEW FEATURES:

- Named contracts with `extends` for inheritance (additive merge)
- Generalized dot-path resolution: `$def.name.nested.path`,
  `$contract.name.section`
- `$contract` as first-class reference type with path access
- `$def` inside contracts supported via two-pass resolution
- `$def` aliasing for reducing repetition: `{ "c": "$contract.web" }` then
  `$def.c.events`
