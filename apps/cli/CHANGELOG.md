# walkeros

## 4.0.0

### Minor Changes

- 8e06b1f: **BREAKING:** Unified reference syntax: `$store:id` and
  `$secret:NAME` now use the dot separator: `$store.id` and `$secret.NAME`.

  The coherent rule across every walkerOS reference is:
  - **`.`** key or path (resolver looks up or walks what follows)
  - **`:`** literal value or raw-code payload (resolver uses what follows
    verbatim)

  `$var.`, `$def.`, `$env.NAME[:default]`, `$contract.`, and `$code:(…)` are
  unchanged, they already fit the rule.

  Every shipped example, published `walkerOS.json` metadata, doc page, and skill
  has been updated. A new canonical reference-syntax guide lives at
  `/docs/guides/reference-syntax`. Regex constants (`REF_VAR`, `REF_DEF`,
  `REF_ENV`, `REF_CONTRACT`, `REF_STORE`, `REF_SECRET`, `REF_CODE_PREFIX`) are
  exported from `@walkeros/core` import these instead of hand-rolling regexes.

  ### Upgrade

  Search-and-replace across your flow configs:

  ```
  $store:<id>      → $store.<id>
  $secret:<NAME>   → $secret.<NAME>
  ```

  Everything else stays the same. Your `$var.*`, `$def.*`, `$env.*`,
  `$contract.*`, and `$code:*` references need no changes.

### Patch Changes

- Updated dependencies [0ffb1d3]
- Updated dependencies [ca237ef]
- Updated dependencies [6422b9b]
- Updated dependencies [78b651a]
- Updated dependencies [6422b9b]
- Updated dependencies [93ea9c4]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [1ef33d9]
  - @walkeros/cli@4.0.0

## 3.4.2

### Patch Changes

- Updated dependencies [2d25eda]
- Updated dependencies [cb4c069]
  - @walkeros/cli@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [caea905]
- Updated dependencies [caea905]
  - @walkeros/cli@3.4.1

## 3.4.0

### Patch Changes

- Updated dependencies [1a0f8f2]
- Updated dependencies [9f97bdd]
  - @walkeros/cli@3.4.0

## 3.3.1

### Patch Changes

- Updated dependencies [62f6a38]
  - @walkeros/cli@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [ae02457]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/cli@3.3.0

## 2.0.1

### Patch Changes

- Updated dependencies [2b259b6]
- Updated dependencies [6ae0ee3]
- Updated dependencies [ddd6a21]
- Updated dependencies [d11f574]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [67dd7c8]
- Updated dependencies [d5af3cf]
- Updated dependencies [499e27a]
- Updated dependencies [55ce33e]
- Updated dependencies [b6c8fa8]
  - @walkeros/cli@3.0.0

## 1.0.9

### Patch Changes

- Updated dependencies [a2f27d4]
- Updated dependencies [1ae6972]
- Updated dependencies [7b2d750]
  - @walkeros/cli@2.0.0

## 1.0.8

### Patch Changes

- Updated dependencies [087eb2d]
- Updated dependencies [087eb2d]
  - @walkeros/cli@1.3.0

## 1.0.7

### Patch Changes

- Updated dependencies [cc68f50]
  - @walkeros/cli@1.2.0

## 1.0.6

### Patch Changes

- Updated dependencies [6fcfaf5]
  - @walkeros/cli@1.1.3

## 1.0.5

### Patch Changes

- @walkeros/cli@1.1.2

## 1.0.4

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/cli@1.1.1

## 1.0.3

### Patch Changes

- Updated dependencies [888bbdf]
- Updated dependencies [fdf6e7b]
  - @walkeros/cli@1.1.0

## 1.0.2

### Patch Changes

- Updated dependencies [2709933]
- Updated dependencies [04469bb]
- Updated dependencies [544a79e]
- Updated dependencies [4da2ef3]
- Updated dependencies [2f82a2e]
  - @walkeros/cli@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [eb878df]
  - @walkeros/cli@1.0.1

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/cli@1.0.0
