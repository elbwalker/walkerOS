# @walkeros/transformer-validate

## 4.2.0

### Minor Changes

- 23d4b86: New `@walkeros/transformer-validate` transformer validates events
  against JSON Schema contracts. It runs in both web and server flows, supports
  strict and pass modes, and writes the verdict and error list to configurable
  paths so you can gate or observe event quality.

  The declarative per-step `validate` field on sources, transformers, and
  destinations is removed. Define event shapes in the top-level `contract` and
  enforce them at runtime by adding a `transformer-validate` step that
  references them via `$contract.<name>`; `format: true` still checks an event
  is a valid `WalkerOS.PartialEvent`. Design-time validation now checks step
  examples against the resolved contract.

### Patch Changes

- 0cad016: Fix schema-only contract rules being skipped during validation. A
  contract rule that carries only a whole-event `schema` (no `events` block) is
  now enforced instead of being treated as an inert inline schema.
- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [c27d3c1]
- Updated dependencies [654ba38]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
