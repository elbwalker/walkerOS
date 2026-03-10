---
'@walkeros/core': minor
'@walkeros/transformer-validator': minor
'@walkeros/cli': minor
---

Add v2 structured contract format with globals, context, custom, user, and
consent sections.

Contracts can now describe cross-event properties (globals, consent, etc.)
alongside entity-action event schemas. Top-level sections are JSON Schemas that
merge additively into per-event validation.

Breaking: None. Legacy flat contracts continue working unchanged. v2 is opt-in
via `version: 2` field.
