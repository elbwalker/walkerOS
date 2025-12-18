# @walkeros/web-source-browser

## 0.5.1-next.0

### Patch Changes

- @walkeros/collector@0.5.1-next.0
- @walkeros/web-core@0.5.1-next.0

## 0.5.0

### Minor Changes

- just flow

### Patch Changes

- Updated dependencies
- Updated dependencies [22cd09c]
  - @walkeros/collector@0.5.0
  - @walkeros/web-core@0.5.0

## 0.4.2

### Patch Changes

- @walkeros/collector@0.4.2
- @walkeros/web-core@0.4.2

## 0.4.1

### Patch Changes

- dev entry
- Updated dependencies
  - @walkeros/collector@0.4.1
  - @walkeros/web-core@0.4.1

## 0.4.0

### Minor Changes

- Consolidate schemas and examples under `/dev` export

### Patch Changes

- Updated dependencies
  - @walkeros/collector@0.4.0
  - @walkeros/web-core@0.4.0

## 0.3.2

### Patch Changes

- Fix browser source initialization failure when session tracking is enabled.
  The browser source was creating an incomplete collector interface missing the
  `command` function, causing session initialization to fail with "command is
  not a function" error. The fix ensures the `command` function from the
  environment is properly passed through to session initialization.

## 0.3.1

### Patch Changes

- @walkeros/collector@0.3.1
- @walkeros/web-core@0.3.1

## 0.3.0

### Minor Changes

- [schema #555](https://github.com/elbwalker/walkerOS/issues/555)

### Patch Changes

- Updated dependencies
  - @walkeros/collector@0.3.0
  - @walkeros/web-core@0.3.0

## 0.2.1

### Patch Changes

- Schema builder, event-level mapping policies, config package, fixed jest mocks
- Updated dependencies
  - @walkeros/collector@0.2.1
  - @walkeros/web-core@0.2.1

## 0.2.0

### Minor Changes

- env

### Patch Changes

- Updated dependencies
  - @walkeros/collector@0.2.0
  - @walkeros/web-core@0.2.0

## 0.1.2

### Patch Changes

- a0ced16: env
- Updated dependencies [a0ced16]
  - @walkeros/collector@0.1.2
  - @walkeros/web-core@0.1.2

## 0.1.1

### Patch Changes

- flow
- Updated dependencies
  - @walkeros/collector@0.1.1
  - @walkeros/web-core@0.1.1

## 0.1.0

### Minor Changes

- fixes

### Patch Changes

- Updated dependencies
  - @walkeros/collector@0.1.0
  - @walkeros/web-core@0.1.0

## 0.0.10

### Patch Changes

- page view fix

## 0.0.9

### Patch Changes

- custom prefix

## 0.0.8

### Patch Changes

- af0ea64: init fixes
- Updated dependencies [af0ea64]
  - @walkeros/collector@0.0.8
  - @walkeros/web-core@0.0.8
