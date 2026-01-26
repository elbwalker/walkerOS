# @walkeros/collector

## 1.0.1

### Patch Changes

- b65b773: Queue on() events until destination init completes

  Destinations now receive `on('consent')` and other lifecycle events only after
  `init()` has completed. Previously, `on()` was called before `init()`,
  requiring workarounds like gtag's `initializeGtag()` call inside its `on()`
  handler.

  Also renamed queue properties for clarity:
  - `destination.queue` → `destination.queuePush`
  - `destination.onQueue` → `destination.queueOn`

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
