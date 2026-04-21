# @walkeros/web-destination-gtag

## 3.4.0

### Minor Changes

- 525f5d9: Introduce the standardized `StepExample.out` shape:
  `[callable, ...args][]` where each tuple is a function call (first element is
  the callable name) or a `['return', value]` tuple for transformer-style
  returns. Every effect is self-describing; docs and tools can render it
  uniformly without a per-package registry.

  Ship the shared `formatOut` renderer from `@walkeros/core` for docs + app.
  Also exports `StepEffect` and `StepOut` types. Migrate
  `@walkeros/web-destination-gtag` to the new shape as the canary — its
  multi-tool outputs (GA4 + Ads + GTM) now flatten into a single array of
  `gtag(...)` and `dataLayer.push(...)` tuples in observed execution order.
  Remaining destination packages ship the old shape until the bulk migration
  (separate plan).

### Patch Changes

- @walkeros/web-core@3.4.0

## 3.3.1

### Patch Changes

- @walkeros/web-core@3.3.1

## 3.3.0

### Minor Changes

- 08c365a: **BREAKING:** `settings.include` and `mapping.settings.*.include`
  have been removed. Use `config.include` (destination-level) and
  `mapping.include` (per-event rule-level) instead. The include logic is now
  handled by the walkerOS core/collector — the destination receives
  pre-flattened properties in `context.data` automatically.

  Migration:

  Before:

  ```json
  "config": {
    "settings": { "ga4": { "include": ["data"] } }
  }
  ```

  After:

  ```json
  "config": {
    "include": ["data"]
  }
  ```

  For per-event overrides:

  Before:

  ```json
  "mapping": { "order": { "complete": { "settings": { "ga4": { "include": ["data", "globals"] } } } } }
  ```

  After:

  ```json
  "mapping": { "order": { "complete": { "include": ["data", "globals"] } } }
  ```

### Patch Changes

- 08c365a: Add `command` field to `Flow.StepExample` for routing non-event
  inputs through walker commands (`consent`, `user`, `run`, `config`). Replaces
  the gtag-only `_consent: true` magic marker pattern. Test runners can now
  explicitly opt into `elb('walker <command>', in)` instead of pushing `in` as a
  regular event.

  **Breaking for anyone copying gtag's step-example test runner:** the
  `_consent: true` magic marker on `mapping` is gone. Migrate to
  `command: 'consent'` on `Flow.StepExample`.
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

## 1.0.6

### Patch Changes

- @walkeros/web-core@2.0.0

## 1.0.5

### Patch Changes

- @walkeros/web-core@1.0.5

## 1.0.4

### Patch Changes

- @walkeros/web-core@1.0.4

## 1.0.3

### Patch Changes

- @walkeros/web-core@1.0.3

## 1.0.2

### Patch Changes

- @walkeros/web-core@1.0.2

## 1.0.1

### Patch Changes

- b65b773: Remove initializeGtag workaround from on() handler

  The `on('consent')` handler no longer needs to call `initializeGtag()` as a
  workaround. With the collector fix, `on()` is now guaranteed to run after
  `init()` completes, so `window.gtag` is always available.
  - @walkeros/web-core@1.0.1

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/web-core@1.0.0
