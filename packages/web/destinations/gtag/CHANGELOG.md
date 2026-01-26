# @walkeros/web-destination-gtag

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
