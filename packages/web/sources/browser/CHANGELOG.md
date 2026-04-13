# @walkeros/web-source-browser

## 3.3.0

### Patch Changes

- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/collector@3.3.0
  - @walkeros/web-core@3.3.0

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
  - @walkeros/collector@3.2.0
  - @walkeros/web-core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/collector@3.1.1
- @walkeros/web-core@3.1.1

## 3.1.0

### Minor Changes

- a9149e4: Add createTrigger to browser source examples following unified
  Trigger.CreateFn interface. Step examples migrated to HTML content format with
  trigger metadata. Collector simulate.ts updated with dual-path support for
  createTrigger and legacy triggers.

### Patch Changes

- Updated dependencies [a9149e4]
- Updated dependencies [ff58828]
- Updated dependencies [df990d4]
  - @walkeros/collector@3.1.0
  - @walkeros/web-core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/collector@3.0.2
- @walkeros/web-core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/collector@3.0.1
- @walkeros/web-core@3.0.1

## 3.0.0

### Patch Changes

- a30095c: Fix Shadow DOM support: use composedPath for event targets, recurse
  into open shadow roots for element discovery and property collection
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [499e27a]
- Updated dependencies [499e27a]
- Updated dependencies [a2aa491]
- Updated dependencies [b6c8fa8]
  - @walkeros/collector@3.0.0
  - @walkeros/web-core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/collector@2.1.1
  - @walkeros/web-core@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

- 60f0a1c: Add setup functions and renderer metadata for source simulation
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [026c412]
  - @walkeros/collector@2.1.0
  - @walkeros/web-core@2.1.0

## 2.0.1

## 1.1.4

### Patch Changes

- e7914fb: Update internal dependencies to use >= ranges
- Updated dependencies [32bfc92]
  - @walkeros/collector@2.0.0
  - @walkeros/web-core@2.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [a4cc1ea]
- Updated dependencies [9599e60]
- Updated dependencies [e9c9faa]
  - @walkeros/collector@1.2.0
  - @walkeros/web-core@1.0.5

## 1.1.2

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/collector@1.1.2
  - @walkeros/web-core@1.0.4

## 1.1.1

### Patch Changes

- @walkeros/collector@1.1.1
- @walkeros/web-core@1.0.3

## 1.1.0

### Minor Changes

- a38d791: Session detection extracted to standalone sourceSession
  - New `sourceSession` for composable session management
  - Browser source no longer includes session by default
  - To restore previous behavior, add sourceSession alongside browser source:

  ```typescript
  sources: {
    browser: sourceBrowser,
    session: { code: sourceSession, config: { storage: true } }
  }
  ```

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/collector@1.1.0
  - @walkeros/web-core@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [b65b773]
  - @walkeros/collector@1.0.1
  - @walkeros/web-core@1.0.1

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/collector@1.0.0
  - @walkeros/web-core@1.0.0
