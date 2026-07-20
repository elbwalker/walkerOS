# @walkeros/web-destination-api

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/web-core@4.3.1

## 4.3.0

### Minor Changes

- e01036e: Flow observation records now carry per-event journey correlation: a
  W3C `traceparent` links a web send to the server flow that receives it, plus
  the originating source id and a monotonic sequence that makes dropped
  telemetry visible. At trace level, destinations can opt in to recording their
  outgoing vendor calls.

### Patch Changes

- Updated dependencies [83ea3c6]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [ebd193f]
  - @walkeros/web-core@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1
  - @walkeros/web-core@4.2.1

## 4.2.0

### Patch Changes

- d65bbde: Internal type-safety cleanup: removed unsafe casts around browser
  globals and env mocks by typing each destination's `Env` and reading globals
  through `getEnv<Env>(env)`. No behavior change.
- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
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
  - @walkeros/web-core@4.2.0

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2
- @walkeros/web-core@4.1.2

## 4.1.1

### Patch Changes

- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
- Updated dependencies [edd3836]
  - @walkeros/core@4.1.1
  - @walkeros/web-core@4.1.1

## 4.1.0

### Patch Changes

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
  - @walkeros/web-core@4.1.0

## 4.0.2

### Patch Changes

- @walkeros/web-core@4.0.2

## 4.0.1

### Patch Changes

- @walkeros/web-core@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [93ea9c4]
  - @walkeros/web-core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/web-core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [caea905]
  - @walkeros/web-core@3.4.1

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

- @walkeros/web-core@2.1.0

## 2.0.1

## 1.1.6

### Patch Changes

- @walkeros/web-core@2.0.0

## 1.1.5

### Patch Changes

- @walkeros/web-core@1.0.5

## 1.1.4

### Patch Changes

- @walkeros/web-core@1.0.4

## 1.1.3

### Patch Changes

- @walkeros/web-core@1.0.3

## 1.1.2

### Patch Changes

- @walkeros/web-core@1.0.2

## 1.1.1

### Patch Changes

- @walkeros/web-core@1.0.1

## 1.1.0

### Minor Changes

- ae79bfa: Add batching support with `pushBatch` method and `init` for early URL
  validation

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/web-core@1.0.0
