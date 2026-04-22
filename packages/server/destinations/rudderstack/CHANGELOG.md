# @walkeros/server-destination-rudderstack

## 3.4.2

### Patch Changes

- @walkeros/core@3.4.2
- @walkeros/server-core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
  - @walkeros/core@3.4.1
  - @walkeros/server-core@3.4.1

## 3.4.0

### Minor Changes

- 74940cc: Add server-side RudderStack CDP destination with full Segment Spec
  support (Track, Identify, Group, Page, Screen, Alias) via
  @rudderstack/rudder-sdk-node SDK. Includes graceful shutdown via flush(),
  identity resolution per-call, alias support for identity merging, and state
  diffing for identify/group.
- 724f97e: Migrate every step example in every walkerOS package to the
  standardized `[callable, ...args][]` shape introduced in `@walkeros/core`.
  Every step example's `out` is now an array of effect tuples whose first
  element is the callable's public SDK name (`'gtag'`, `'analytics.track'`,
  `'fbq'`, `'dataLayer.push'`, `'sendServer'`, `'fetch'`, `'trackClient.track'`,
  `'amplitude.track'`, `'fs.writeFile'`, `'producer.send'`, `'client.xadd'`,
  `'client.send'`, `'dataset.table.insert'`, etc.). Source examples use `'elb'`
  as the callable; transformer examples use the reserved `'return'` keyword;
  store examples use store-operation callables (`'get'`, `'set'`). Tests capture
  real calls on each component's spy and assert against `example.out` directly —
  the hardcoded `PACKAGE_CALLS` registry in the app is no longer consulted
  (emptied; plan #3 removes it structurally).

### Patch Changes

- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0
  - @walkeros/server-core@3.4.0
