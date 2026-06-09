---
'@walkeros/transformer-validate': patch
---

Fix schema-only contract rules being skipped during validation. A contract rule
that carries only a whole-event `schema` (no `events` block) is now enforced
instead of being treated as an inert inline schema.
