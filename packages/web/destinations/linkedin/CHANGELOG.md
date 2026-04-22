# @walkeros/web-destination-linkedin

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
