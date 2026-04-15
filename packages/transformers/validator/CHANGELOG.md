# @walkeros/transformer-validator

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

### Major Changes

- 23f218a: Replace flat/v2 contract format with named contracts supporting
  extends inheritance.

  BREAKING CHANGES:
  - `contract` is now a map of named contract entries (e.g.,
    `{ "default": { ... }, "web": { ... } }`)
  - `version` field inside contracts removed
  - `$tagging` renamed to `tagging`
  - Legacy flat contract format removed
  - `$globals`, `$context`, `$custom`, `$user`, `$consent` references removed
  - Settings-level `contract` field removed (use named contracts at config
    level)
  - Auto-injection of `$tagging` into `collector.tagging` removed (use
    `$contract.name.tagging` explicitly)
  - Validator `contract` setting renamed to `events` (receives raw schemas, not
    `{ schema: ... }` wrappers)

  NEW FEATURES:
  - Named contracts with `extends` for inheritance (additive merge)
  - Generalized dot-path resolution: `$def.name.nested.path`,
    `$contract.name.section`
  - `$contract` as first-class reference type with path access
  - `$def` inside contracts supported via two-pass resolution
  - `$def` aliasing for reducing repetition: `{ "c": "$contract.web" }` then
    `$def.c.events`

### Minor Changes

- 6ae0ee3: Add v2 structured contract format with globals, context, custom,
  user, and consent sections.

  Contracts can now describe cross-event properties (globals, consent, etc.)
  alongside entity-action event schemas. Top-level sections are JSON Schemas
  that merge additively into per-event validation.

  Breaking: None. Legacy flat contracts continue working unchanged. v2 is opt-in
  via `version: 2` field.

### Patch Changes

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

## 2.1.1

### Patch Changes

- fab477d: Replace union transformer return type with unified
  `Transformer.Result` object. Transformers now return `{ event }` instead of
  naked events, and can optionally include `respond` (for wrapping) or `next`
  (for branching). The `BranchResult` type and `__branch` discriminant are
  removed.
- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

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

## 2.0.1

## 5.0.0

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0

## 4.0.0

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0

## 3.0.0

### Patch Changes

- 6778ab2: Add default exports for simpler CLI flow.json configuration
- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0
