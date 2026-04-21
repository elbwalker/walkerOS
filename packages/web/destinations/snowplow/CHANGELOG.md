# @walkeros/web-destination-snowplow

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

- @walkeros/web-core@3.4.0

## 3.3.1

### Patch Changes

- @walkeros/web-core@3.3.1

## 3.3.0

### Patch Changes

- @walkeros/web-core@3.3.0

## 3.2.0

### Patch Changes

- @walkeros/web-core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/web-core@3.1.1

## 3.1.0

### Patch Changes

- Updated dependencies [ff58828]
  - @walkeros/web-core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/web-core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/web-core@3.0.1

## 3.0.0

### Patch Changes

- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [499e27a]
  - @walkeros/web-core@3.0.0

## 2.1.1

### Patch Changes

- @walkeros/web-core@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

- 97df0b2: Remove legacy events/mapping/outputs example files; tests now derive
  from step examples
  - @walkeros/web-core@2.1.0

## 2.0.1

## 0.0.13

### Patch Changes

- @walkeros/web-core@2.0.0

## 0.0.12

### Patch Changes

- @walkeros/web-core@1.0.5

## 0.0.11

### Patch Changes

- @walkeros/web-core@1.0.4

## 0.0.10

### Patch Changes

- @walkeros/web-core@1.0.3

## 0.0.9

### Patch Changes

- @walkeros/web-core@1.0.2

## 0.0.8

### Patch Changes

- @walkeros/web-core@1.0.1
