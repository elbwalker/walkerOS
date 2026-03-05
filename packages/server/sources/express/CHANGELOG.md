# @walkeros/server-source-express

## 2.1.0

### Minor Changes

- 3eb6416: Add unified `env.respond` capability. Any step (transformer,
  destination) can now customize HTTP responses via
  `env.respond({ body, status?, headers? })`. Sources configure the response
  handler — Express source uses createRespond for idempotent first-call-wins
  semantics. CLI serve mode removed (superseded by response-capable flows).
- 66aaf2d: Runner-owned health server: The runner now provides /health and
  /ready endpoints independently of flow sources. Express source's `status`
  setting and fetch source's `healthPath` setting have been removed — health
  endpoints are no longer source responsibilities.
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

## 1.1.0

### Minor Changes

- bb0ab04: Add multi-path support with per-route method control. The `path`
  setting is deprecated in favor of `paths` array.

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0

## 1.0.5

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0

## 1.0.4

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2

## 1.0.3

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1

## 1.0.2

### Patch Changes

- 6778ab2: Add default exports for simpler CLI flow.json configuration
- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0

## 1.0.1

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
