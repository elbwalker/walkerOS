# @walkeros/web-source-cmp-usercentrics

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
  - @walkeros/collector@3.4.0

## 3.3.1

### Patch Changes

- Updated dependencies [b10144a]
- Updated dependencies [206185a]
- Updated dependencies [50e5d09]
- Updated dependencies [32ff626]
  - @walkeros/collector@3.3.1
  - @walkeros/core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0
  - @walkeros/collector@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [8cdc0bb]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
- Updated dependencies [a5d25bc]
- Updated dependencies [9a99298]
- Updated dependencies [884527d]
  - @walkeros/core@3.2.0
  - @walkeros/collector@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1
- @walkeros/collector@3.1.1

## 3.1.0

### Minor Changes

- 956c337: Add createTrigger following unified Trigger.CreateFn interface. Step
  examples updated with trigger metadata.

### Patch Changes

- Updated dependencies [a9149e4]
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/collector@3.1.0
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2
- @walkeros/collector@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1
- @walkeros/collector@3.0.1

## 3.0.0

### Patch Changes

- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [a2aa491]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0
  - @walkeros/collector@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/collector@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

- 60f0a1c: Add setup functions and renderer metadata for source simulation
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
  - @walkeros/collector@2.1.0

## 2.0.1

## 0.1.1

### Patch Changes

- Updated dependencies [32bfc92]
- Updated dependencies [7b2d750]
  - @walkeros/collector@2.0.0
  - @walkeros/core@1.4.0
