# @walkeros/web-source-cmp-cookiebot

## 4.9.0

### Patch Changes

- 29d2218: New Cookiebot consent source. It reads the visitor's choice from
  `window.Cookiebot` and Cookiebot's accept and decline events, and maps
  `preferences`, `statistics` and `marketing` to `functional`, `analytics` and
  `marketing`. Strictly necessary cookies are reported as `necessary` and grant
  no consent group. Implied consent is skipped unless `explicitOnly` is `false`,
  so by default a visitor Cookiebot never asks sends no consent.
- Updated dependencies [a67546d]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [34fd225]
- Updated dependencies [1306d8a]
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
- Updated dependencies [1fb57b0]
- Updated dependencies [5313635]
  - @walkeros/core@4.9.0
  - @walkeros/collector@4.9.0
