# @walkeros/web-source-session

## 1.1.3

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0
  - @walkeros/web-core@1.0.5

## 1.1.2

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2
  - @walkeros/web-core@1.0.4

## 1.1.1

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1
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
  - @walkeros/core@1.2.0
  - @walkeros/web-core@1.0.2
