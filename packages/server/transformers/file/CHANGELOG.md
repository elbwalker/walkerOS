# @walkeros/server-transformer-file

## 4.2.0

### Patch Changes

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

- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/core@4.1.1

## 4.1.0

### Patch Changes

- adeebea: Add `Flow.Store.cache` for store-level caching: read-through +
  write-through wrapper with single-flight dedup, recursive composition via
  `cache.store`, and per-wrapper counters. `CacheRule` is now a discriminated
  union (`EventCacheRule | StoreCacheRule`); schema rejects inert fields in
  store contexts.

  Built-in `__cache` upgraded with LRU, `maxEntries: 10000`, batched eviction,
  and active TTL sweep.

  **Breaking:** `@walkeros/store-memory` is removed. Its logic is absorbed into
  `__cache`. Migration: drop the store declaration, or omit `cache.store` to use
  the built-in tier. `flow_validate` flags legacy references.

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

## 4.0.2

### Patch Changes

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/core@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
  - @walkeros/core@3.4.1

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

## 3.3.1

### Patch Changes

- @walkeros/core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
  - @walkeros/core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1

## 3.1.0

### Patch Changes

- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1

## 3.0.0

### Minor Changes

- dd28898: Add file serving transformer that serves static files through any
  Store backend. I/O-agnostic: works with FsStore, MemoryStore, or any
  Store.Instance. Built-in MIME type detection and configurable prefix
  stripping.

### Patch Changes

- 5cb84c1: Replace hand-written MCP resources with auto-generated JSON Schemas
  from @walkeros/core. Add walkerOS.json to 5 transformer packages. Variables
  resource remains hand-maintained (runtime interpolation patterns).
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- b6c8fa8: Add stores as a first-class component type in Flow.Config. Stores get
  their own `stores` section in flow settings, a `collector.stores` registry,
  and `$store:storeId` env wiring in the bundler. Includes `storeMemoryInit` for
  Flow.Config compatibility and type widening in cache/file transformers.
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
