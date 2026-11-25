# @walkeros/server-store-api

## 4.10.0

### Patch Changes

- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0

## 4.9.0

### Patch Changes

- 1fb57b0: New read-only store for third-party HTTP APIs. Each key is one GET to
  a URL template with a `{key}` placeholder, with an optional bearer token. A
  404, a 204 or a `null` body is a miss and every other failure is reported at
  `ERROR`. Pair it with the store cache to cut repeated requests.
- Updated dependencies [a67546d]
- Updated dependencies [1306d8a]
- Updated dependencies [34fd225]
- Updated dependencies [5313635]
- Updated dependencies [1306d8a]
- Updated dependencies [fa46337]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [34fd225]
- Updated dependencies [fa46337]
- Updated dependencies [1306d8a]
- Updated dependencies [5313635]
  - @walkeros/core@4.9.0
