# @walkeros/web-destination-posthog

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

- 08c365a: Add PostHog web destination (`@walkeros/web-destination-posthog`) —
  product analytics, identity with `$set`/`$set_once` person properties, groups,
  logout via reset, consent opt-in/opt-out, plus passthrough for all built-in
  PostHog features (session replay, feature flags, surveys, heatmaps, error
  tracking) via the official `posthog-js` npm package.
  - Default event forwarding: every walkerOS event becomes
    `posthog.capture(name, properties)`
  - Custom event properties: `settings.include` flattens walkerOS event sections
    with prefix (`data_*`, `globals_*`, etc.)
  - Identity: destination-level + per-event `settings.identify`, resolving to
    `{ distinctId?, $set?, $set_once? }`. With `distinctId`:
    `posthog.identify()`. Without `distinctId`: `posthog.setPersonProperties()`
    (property-only updates). Runtime state diffing skips redundant `identify()`
    calls when `distinctId` hasn't changed.
  - Groups: `settings.group` for B2B workflows — destination-level or per-event,
    tracked in runtime state
  - Reset: `settings.reset: true` calls `posthog.reset()` on logout
  - Consent: `on('consent')` handler derives the consent key from
    `config.consent` and toggles
    `posthog.opt_in_capturing()`/`opt_out_capturing()`
  - Built-in features (config passthrough, no destination code): session
    recording, feature flags, surveys, heatmaps, exceptions, cookieless mode,
    bootstrap
  - walkerOS defaults override PostHog defaults: `autocapture: false`,
    `capture_pageview: false`, `capture_pageleave: false` — walkerOS sources
    handle event capture
  - SDK resolution follows the `env?.posthog ?? posthog` pattern (mirrors
    `@walkeros/web-destination-clarity` and `@walkeros/server-destination-gcp`
    BigQuery)

### Patch Changes

- @walkeros/web-core@3.3.0
