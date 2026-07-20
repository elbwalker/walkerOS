# @walkeros/web-destination-tiktok

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/web-core@4.3.1

## 4.3.0

### Patch Changes

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

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2
- @walkeros/web-core@4.1.2

## 4.1.1

### Patch Changes

- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
- Updated dependencies [edd3836]
  - @walkeros/core@4.1.1
  - @walkeros/web-core@4.1.1

## 4.1.0

### Patch Changes

- Updated dependencies [e155ff8]
- Updated dependencies [e800974]
- Updated dependencies [e155ff8]
- Updated dependencies [1a8f2d7]
- Updated dependencies [1a8f2d7]
- Updated dependencies [b276173]
- Updated dependencies [dd9f5ad]
- Updated dependencies [c60ef35]
- Updated dependencies [adeebea]
- Updated dependencies [13aaeaa]
- Updated dependencies [e800974]
- Updated dependencies [adeebea]
- Updated dependencies [e800974]
- Updated dependencies [e800974]
- Updated dependencies [058f7ed]
- Updated dependencies [28a8ac2]
- Updated dependencies [fd6076e]
  - @walkeros/core@4.1.0
  - @walkeros/web-core@4.1.0

## 4.0.2

### Patch Changes

- @walkeros/web-core@4.0.2

## 4.0.1

### Patch Changes

- @walkeros/web-core@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [93ea9c4]
  - @walkeros/web-core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/web-core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [caea905]
  - @walkeros/web-core@3.4.1

## 3.4.0

### Minor Changes

- 724f97e: Migrate every step example in every walkerOS package to the
  standardized `[callable, ...args][]` shape introduced in `@walkeros/core`.
  Every step example's `out` is now an array of effect tuples whose first
  element is the callable's public SDK name (`'gtag'`, `'analytics.track'`,
  `'fbq'`, `'dataLayer.push'`, `'sendServer'`, `'fetch'`, `'trackClient.track'`,
  `'amplitude.track'`, `'fs.writeFile'`, `'producer.send'`, `'client.xadd'`,
  `'client.send'`, `'dataset.table.insert'`, etc.). Source examples use `'elb'`
  as the callable; transformer examples use the reserved `'return'` keyword;
  store examples use store-operation callables (`'get'`, `'set'`). Tests capture
  real calls on each component's spy and assert against `example.out` directly —
  the hardcoded `PACKAGE_CALLS` registry in the app is no longer consulted
  (emptied; plan #3 removes it structurally).

### Patch Changes

- @walkeros/web-core@3.4.0

## 3.3.1

### Patch Changes

- @walkeros/web-core@3.3.1

## 3.3.0

### Minor Changes

- 08c365a: Add TikTok Pixel web destination (`@walkeros/web-destination-tiktok`)
  — conversion tracking, Advanced Matching, and consent-aware cookie handling
  via the official TikTok Pixel snippet. No npm SDK dependency; loads from
  TikTok's CDN.
  - Default event forwarding: every walkerOS event becomes a
    `ttq.track(name, params, { event_id })` call. `event_id` is always
    `walkerOS event.id` for deduplication with a future server-side Events API
    destination.
  - Event renaming via standard walkerOS `mapping.name`. A `StandardEventNames`
    TypeScript union exports all 14 TikTok standard events (ViewContent,
    AddToCart, CompletePayment, …) for IDE autocomplete; arbitrary strings still
    work as custom events.
  - Advanced Matching: destination-level + per-event `settings.identify`
    resolving to `{ email, phone_number, external_id }`. Runtime state diffing
    skips redundant `ttq.identify()` calls on unchanged values. TikTok's SDK
    auto-hashes all values with SHA256 before sending.
  - Custom event properties: `settings.include` flattens walkerOS event sections
    with prefix (`data_*`, `globals_*`, etc.) — useful for custom events where
    TikTok won't optimize anyway.
  - Ecommerce via standard `mapping.data`: users build `contents`, `value`,
    `currency`, `order_id` through walkerOS's built-in `map` and `loop`. No
    destination-specific ecommerce logic.
  - Consent: `config.consent` gate (typically `{ marketing: true }` since TikTok
    is an ad platform). `on('consent')` handler toggles `ttq.enableCookie()` /
    `ttq.disableCookie()`.
  - TikTok's SDK auto-fires `ttq.page()` on init; no destination knob to
    suppress it (decision 2026-04-09 — the knob was unreliable, letting the auto
    page view fire is expected behavior).
  - Script-tag only: no npm SDK exists for TikTok Pixel. The destination uses
    the standard snippet + `addScript()` pattern from
    `@walkeros/web-destination-meta`, loading from
    `analytics.tiktok.com/i18n/pixel/events.js`.

### Patch Changes

- @walkeros/web-core@3.3.0
