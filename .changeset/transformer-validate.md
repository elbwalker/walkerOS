---
'@walkeros/transformer-validate': minor
'@walkeros/core': minor
'@walkeros/cli': patch
---

New `@walkeros/transformer-validate` transformer validates events against JSON
Schema contracts. It runs in both web and server flows, supports strict and pass
modes, and writes the verdict and error list to configurable paths so you can
gate or observe event quality.

The declarative per-step `validate` field on sources, transformers, and
destinations is removed. Define event shapes in the top-level `contract` and
enforce them at runtime by adding a `transformer-validate` step that references
them via `$contract.<name>`; `format: true` still checks an event is a valid
`WalkerOS.PartialEvent`. Design-time validation now checks step examples against
the resolved contract.
