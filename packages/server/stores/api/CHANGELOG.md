# @walkeros/server-store-api

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
