# @walkeros/web-source-browser

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
