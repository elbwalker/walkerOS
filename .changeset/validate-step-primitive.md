---
'@walkeros/core': minor
'@walkeros/cli': minor
'@walkeros/transformer-validator': minor
---

Add step-level `validate?` primitive on every walkerOS step. Declare validation
inline on a source, transformer, or destination, and the CLI auto-injects the
validator transformer at the correct chain position.

Restructure validator settings and contract to a uniform
`{ format, events, schema }` shape: a single agnostic JSON Schema replaces the
typed section fields (`globals`, `context`, `custom`, `user`, `consent`).

Tree-shaking: flows without `validate:` continue to ship zero AJV bytes; the
validator package only enters the dependency graph when the auto-injector adds
it.

`@walkeros/transformer-validator` is deprecated for direct imports but remains
the runtime that powers `validate:`.
