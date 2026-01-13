# @walkeros/collector

## 0.7.0

### Minor Changes

- f5120b2: Simplify PushResult structure and enable destination response data
  - Changed `PushResult` from array-based (`successful[]`, `queued[]`,
    `failed[]`) to object-based (`done?`, `queued?`, `failed?`) with
    `Record<string, Destination.Ref>` structure
  - Updated `Destination.Ref` from `{ id, destination }` to
    `{ type, data?, error? }` to capture response data from destinations
  - Changed `Destination.PushFn` return type from `void` to `void | unknown`
    allowing destinations to return response data
  - Added `createPushResult()` helper function for standardized result creation
  - Results are now keyed by destination ID for easier access (e.g.,
    `result.done?.myDestination`)

### Patch Changes

- Updated dependencies [f5120b2]
  - @walkeros/core@0.7.0

## 0.0.0-next-20251219153324

### Patch Changes

- Updated dependencies [5163b01]
  - @walkeros/core@0.0.0-next-20251219153324

## 0.5.1-next.0

### Patch Changes

- Updated dependencies [5163b01]
  - @walkeros/core@0.5.1-next.0

## 0.5.0

### Minor Changes

- just flow
- 22cd09c: code destination

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.5.0

## 0.4.2

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @walkeros/core@0.4.2

## 0.4.1

### Patch Changes

- dev entry
- Updated dependencies
  - @walkeros/core@0.4.1

## 0.4.0

### Minor Changes

- Consolidate schemas and examples under `/dev` export

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.3.1

## 0.3.0

### Minor Changes

- [schema #555](https://github.com/elbwalker/walkerOS/issues/555)

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.3.0

## 0.2.1

### Patch Changes

- Schema builder, event-level mapping policies, config package, fixed jest mocks
- Updated dependencies
  - @walkeros/core@0.2.1

## 0.2.0

### Minor Changes

- env

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.2.0

## 0.1.2

### Patch Changes

- a0ced16: env
- Updated dependencies [a0ced16]
  - @walkeros/core@0.1.2

## 0.1.1

### Patch Changes

- flow
- Updated dependencies
  - @walkeros/core@0.1.1

## 0.1.0

### Minor Changes

- fixes

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.1.0

## 0.0.8

### Patch Changes

- af0ea64: init fixes
- Updated dependencies [af0ea64]
  - @walkeros/core@0.0.8
