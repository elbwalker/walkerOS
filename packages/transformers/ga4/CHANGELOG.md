# @walkeros/transformer-ga4

## 4.3.0

### Patch Changes

- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1

## 4.2.0

### Patch Changes

- e8f6909: Documentation fix: server source `config.ingest` examples now use the
  `map` operator with direct request field paths instead of a bare object. A
  bare object like `{ url: 'req.url' }` is silently inert, so the ingest stayed
  empty and downstream `ingest.*` fields never resolved. Affects package hints,
  READMEs, the core source type docs, and the bundled CLI example.
- 6a72a32: The MCP `flow_simulate` and `flow_bundle` tools now accept a cloud
  flow id as `configPath`, so you can simulate or bundle a saved flow without a
  manual file round-trip, and repeated simulations reuse a prebuilt bundle for
  faster runs. Loading or fetching a flow with no default project set now
  returns a clear "no default project" error, and `flow_examples` surfaces a
  referenced package's shipped examples when a step has none inline. Bundle
  stats now report the real total bundle size and list package names instead of
  a per-package estimate, and the GA4 transformer documents its wiring contract
  via package hints.
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

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2

## 4.1.1

### Patch Changes

- b0279ee: Add `extend` and `remove` to mapping rules. `extend` deep-merges a
  partial rule onto a package-shipped default (a `null` value clears an
  inherited field); `remove` strips fields from the produced payload. Rules
  without either keyword keep the existing replace behavior.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/core@4.1.1

## 4.1.0

### Patch Changes

- 6cdc362: Add `@walkeros/transformer-ga4`: GA4 Measurement Protocol v2 decoder
  transformer with default mappings for 33 standard events. Server-side use via
  `source-express` in the `before` chain.

  Also: fix collector to preserve fan-out in `source.before` chains. Previously,
  when a before-transformer returned an array of events, only the first
  survived. This enables vendor-protocol decoders (GA4, Segment, Snowplow, etc.)
  to fan a batched request into N walkerOS events.

- Updated dependencies [e155ff8]
- Updated dependencies [e800974]
- Updated dependencies [e155ff8]
- Updated dependencies [1a8f2d7]
- Updated dependencies [1a8f2d7]
- Updated dependencies [b276173]
- Updated dependencies [dd9f5ad]
- Updated dependencies [c60ef35]
- Updated dependencies [adeebea]
- Updated dependencies [13aaeaa]
- Updated dependencies [e800974]
- Updated dependencies [adeebea]
- Updated dependencies [e800974]
- Updated dependencies [e800974]
- Updated dependencies [058f7ed]
- Updated dependencies [28a8ac2]
- Updated dependencies [fd6076e]
  - @walkeros/core@4.1.0
