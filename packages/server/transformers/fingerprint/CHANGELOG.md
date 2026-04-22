# @walkeros/server-transformer-fingerprint

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

## 3.3.1

### Patch Changes

- @walkeros/server-core@3.3.1
- @walkeros/core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0
  - @walkeros/server-core@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
  - @walkeros/core@3.2.0
  - @walkeros/server-core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1
- @walkeros/server-core@3.1.1

## 3.1.0

### Patch Changes

- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/core@3.1.0
  - @walkeros/server-core@3.1.0

## 3.0.2

### Patch Changes

- afd4d07: Add MCP hints documenting ingest prerequisite and field resolution
  patterns
  - @walkeros/core@3.0.2
  - @walkeros/server-core@3.0.2

## 3.0.1

### Patch Changes

- 86c81d1: Add default export to server-transformer-fingerprint and exports
  metadata to multi-service packages for bundler named import support
  - @walkeros/core@3.0.1
  - @walkeros/server-core@3.0.1

## 3.0.0

### Patch Changes

- 5cb84c1: Replace hand-written MCP resources with auto-generated JSON Schemas
  from @walkeros/core. Add walkerOS.json to 5 transformer packages. Variables
  resource remains hand-maintained (runtime interpolation patterns).
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0
  - @walkeros/server-core@3.0.0

## 2.1.1

### Patch Changes

- fab477d: Replace union transformer return type with unified
  `Transformer.Result` object. Transformers now return `{ event }` instead of
  naked events, and can optionally include `respond` (for wrapping) or `next`
  (for branching). The `BranchResult` type and `__branch` discriminant are
  removed.
- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/server-core@2.1.1

## 2.1.0

### Patch Changes

- be2cff0: Add step examples for simulation and testing
- Updated dependencies [7fc4cee]
- Updated dependencies [7fc4cee]
- Updated dependencies [cb2da05]
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [026c412]
- Updated dependencies [7d38d9d]
  - @walkeros/core@2.1.0
  - @walkeros/server-core@2.1.0

## 2.0.1

## 8.0.0

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0
  - @walkeros/server-core@2.0.0

## 7.0.0

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0
  - @walkeros/server-core@1.0.5

## 6.0.0

### Patch Changes

- 6778ab2: Add default exports for simpler CLI flow.json configuration
- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0
  - @walkeros/server-core@1.0.2

## 5.0.0

### Patch Changes

- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0
  - @walkeros/server-core@1.0.1

## 4.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0
  - @walkeros/server-core@1.0.0
