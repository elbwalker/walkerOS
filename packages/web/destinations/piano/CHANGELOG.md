# @walkeros/web-destination-piano

## 4.8.2

### Patch Changes

- 2374f54: Events no longer vanish while the Piano script loads: pushes wait for
  it, and fail visibly when it is blocked or missing. A missing `site` or
  `collectDomain` is a `config` error, and rules with `silent: true` send no
  event.
- 2374f54: A failed vendor call, a missing required setting (`config`) and an
  event that cannot be sent (`missing-input`) are reported as failed pushes,
  with the dead-letter queue and one ERROR line, instead of counting as
  delivered. Rules with `silent: true` send no event. Settings schemas reject
  unknown keys.
- b1d65e2: Web destinations that load a vendor script inject it through the
  document of their `env`, so simulation and server-side rendering work without
  a browser page. A page still gets the script in its own document by default,
  and a missing document fails the push with `vendor-not-ready`.
- 2374f54: Vendor scripts load through walkerOS: a blocked or slow script fails
  later events visibly (`vendor-not-loaded`, `vendor-timeout`) instead of losing
  them. Pushes made while the script loads wait for it, and each script is
  injected once per page.
- Updated dependencies [2374f54]
- Updated dependencies [7e5fc27]
- Updated dependencies [2374f54]
- Updated dependencies [964590a]
- Updated dependencies [4100ede]
- Updated dependencies [2374f54]
- Updated dependencies [2374f54]
- Updated dependencies [15eb7b2]
- Updated dependencies [33a2779]
- Updated dependencies [33a2779]
- Updated dependencies [b1d65e2]
- Updated dependencies [964590a]
- Updated dependencies [2374f54]
  - @walkeros/core@4.8.2
  - @walkeros/web-core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1
  - @walkeros/web-core@4.8.1

## 4.8.0

### Patch Changes

- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0
  - @walkeros/web-core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/web-core@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
  - @walkeros/web-core@4.7.1
  - @walkeros/core@4.7.1

## 4.7.0

### Patch Changes

- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/core@4.7.0
  - @walkeros/web-core@4.7.0

## 4.6.1

### Patch Changes

- @walkeros/core@4.6.1
- @walkeros/web-core@4.6.1

## 4.6.0

### Patch Changes

- @walkeros/core@4.6.0
- @walkeros/web-core@4.6.0

## 4.5.0

### Patch Changes

- Updated dependencies [63845bb]
- Updated dependencies [79cdcb0]
- Updated dependencies [756b571]
  - @walkeros/core@4.5.0
  - @walkeros/web-core@4.5.0

## 4.4.0

### Patch Changes

- Updated dependencies [6c89afb]
- Updated dependencies [393b942]
- Updated dependencies [034b1de]
- Updated dependencies [d00e2bd]
  - @walkeros/core@4.4.0
  - @walkeros/web-core@4.4.0

## 4.3.2

### Patch Changes

- @walkeros/core@4.3.2
- @walkeros/web-core@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/web-core@4.3.1

## 4.3.0

### Patch Changes

- 1ea8665: With `loadScript: true`, `site` and `collectDomain` now reach the
  Piano SDK reliably. Configuration is applied after the injected script loads,
  instead of being silently skipped on a cold page. If the script fails to load
  (ad blocker, network, CDN), a warning is logged rather than sending
  unconfigured events.
- Updated dependencies [83ea3c6]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [ebd193f]
  - @walkeros/web-core@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1
  - @walkeros/web-core@4.2.1

## 4.2.0

### Patch Changes

- 8063504: Add the Piano Analytics web destination, forwarding events to the
  official Piano `pa` SDK via sendEvent.
- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [c27d3c1]
- Updated dependencies [654ba38]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
  - @walkeros/web-core@4.2.0
