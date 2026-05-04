# @walkeros/web-destination-tiktok

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
