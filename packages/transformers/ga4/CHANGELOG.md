# @walkeros/transformer-ga4

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
