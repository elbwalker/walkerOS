# @walkeros/web-destination-mixpanel

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

- 08c365a: Add Mixpanel web destination (`@walkeros/web-destination-mixpanel`) —
  events, identity, the full 8-operation people vocabulary, group association,
  group profiles, reset, and consent opt-in/opt-out via the official
  `mixpanel-browser` npm package.
  - Default event forwarding: every walkerOS event becomes
    `mixpanel.track(name, properties)`
  - Custom event properties: `settings.include` flattens walkerOS event sections
    with prefix (`data_*`, `globals_*`, etc.)
  - Identity: destination-level + per-event `settings.identify`, resolving to
    `{ distinctId }` → `mixpanel.identify(distinctId)`. Runtime state diffing
    skips redundant identify calls.
  - People: `settings.people` supports the full Mixpanel operation set (`set`,
    `set_once`, `increment`, `append`, `union`, `remove`, `unset`,
    `delete_user`)
  - Groups: `settings.group` for user-group association (`mixpanel.set_group`)
    and `settings.groupProfile` for group profile properties
    (`mixpanel.get_group(key, id).set/set_once/union/remove/unset/delete`)
  - Reset: `settings.reset: true` calls `mixpanel.reset()` on logout
  - Consent: `on('consent')` handler derives the consent keys from
    `config.consent` and toggles `opt_in_tracking`/`opt_out_tracking`
  - All `mixpanel-browser` init options flow through via snake_case passthrough
    (`api_host`, `batch_requests`, `record_sessions_percent`,
    `cross_subdomain_cookie`, etc.). walkerOS-specific defaults:
    `autocapture: false` and `track_pageview: false`
  - SDK resolution follows the `env?.mixpanel ?? mixpanel` pattern (mirrors
    `@walkeros/web-destination-clarity` and `@walkeros/server-destination-gcp`
    BigQuery)

### Patch Changes

- @walkeros/web-core@3.3.0
