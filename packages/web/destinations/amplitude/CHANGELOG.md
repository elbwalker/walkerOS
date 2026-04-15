# @walkeros/web-destination-amplitude

## 3.3.1

### Patch Changes

- @walkeros/web-core@3.3.1

## 3.3.0

### Minor Changes

- 08c365a: Add Amplitude web destination (`@walkeros/web-destination-amplitude`)
  — analytics, identity with full operation vocabulary, revenue (single and
  multi-product via loop), groups, consent opt-out, and three optional plugins
  (Session Replay, Feature Experiments, Guides & Surveys) via the official
  `@amplitude/*` npm packages.
  - Default event forwarding: every walkerOS event becomes
    `amplitude.track(name, event_properties)`
  - Custom event properties: `settings.include` flattens walkerOS event sections
    with prefix (`data_*`, `globals_*`, etc.)
  - Identity: destination-level + per-event `settings.identify`, resolving to
    user/device/session plus the full Identify operation vocabulary (`set`,
    `setOnce`, `add`, `append`, `prepend`, `preInsert`, `postInsert`, `remove`,
    `unset`, `clearAll`). Runtime state diffing skips redundant setter calls.
  - Revenue: `settings.revenue` supports both single-object and `loop`-based
    multi-product orders. Currency defaults to `"EUR"`.
  - Groups: `settings.group` and `settings.groupIdentify` for B2B flows
  - Reset: `settings.reset: true` calls `amplitude.reset()` on logout
  - Consent: `on('consent')` handler derives the consent keys from
    `config.consent` and toggles `amplitude.setOptOut()` (strict: all keys must
    be granted for opt-in)
  - Plugins (all npm-bundled, opt-in via settings): Session Replay, Feature
    Experiments (via `initializeWithAmplitudeAnalytics`), Engagement (Guides &
    Surveys)
  - Async init: awaits `amplitude.init(...).promise` so the destination is truly
    ready before returning
  - SDK resolution follows the `env?.amplitude ?? amplitude` pattern (mirrors
    `@walkeros/web-destination-clarity` and `@walkeros/server-destination-gcp`
    BigQuery)

### Patch Changes

- @walkeros/web-core@3.3.0
