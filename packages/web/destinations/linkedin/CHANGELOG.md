# @walkeros/web-destination-linkedin

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

- 08c365a: Add LinkedIn Insight Tag web destination
  (`@walkeros/web-destination-linkedin`) — opt-in conversion forwarding via
  `window.lintrk('track', ...)`.
  - **Opt-in conversion model:** Events without `mapping.settings.conversion`
    are silently ignored. Each conversion references a pre-created Conversion
    Rule ID from LinkedIn Campaign Manager.
  - **Per-event conversion mapping** with short keys: `id`, `value`, `currency`,
    `eventId` — translated at call time to LinkedIn's `conversion_id` /
    `conversion_value` / `currency` / `event_id`.
  - **Currency fallback** via walkerOS `{ key, value }` syntax — defaults to
    `"EUR"` when `data.currency` is absent.
  - **Deduplication ready** — maps walkerOS `event.id` to LinkedIn's `event_id`
    field, ready for future cross-channel deduplication with a server
    (Conversions API) destination.
  - **Consent-gated:** `marketing` (not `analytics`). The collector's
    `config.consent` gate is the sole mechanism — the Insight Tag has no vendor
    opt-out API. `config.loadScript: true` supports deferred script injection
    after consent grant.
  - **No npm SDK** — the destination injects the official Insight Tag from
    `https://snap.licdn.com/li.lms-analytics/insight.min.js` at runtime.
  - **No identity tracking** — LinkedIn identity is cookie-based and managed
    entirely by the Insight Tag. `li_fat_id` capture is the session source's
    responsibility (future Conversions API destination will consume it).
  - **Covered features:** 8 step-example fixtures including unmapped-event
    ignoring, simple conversion ID, full e-commerce conversion (value +
    currency + eventId), page view key-page-view, LEAD conversion,
    `mapping.skip`, falsy id guard, and partial-fields omission.

### Patch Changes

- @walkeros/web-core@3.3.0
