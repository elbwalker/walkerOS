# @walkeros/web-destination-segment

## 3.3.1

### Patch Changes

- @walkeros/web-core@3.3.1

## 3.3.0

### Minor Changes

- 08c365a: Add Segment CDP web destination (`@walkeros/web-destination-segment`)
  — forwards walkerOS events to Segment via the official
  `@segment/analytics-next` (Analytics.js 2.0) package. Implements the full
  Segment Spec surface with automatic walkerOS→Segment consent context
  forwarding and deferred-load consent handling.
  - Default event forwarding: every walkerOS event becomes
    `analytics.track(name, properties)`
  - Custom event properties: `settings.include` flattens walkerOS event sections
    with prefix (`data_*`, `globals_*`, etc.) or use `mapping.data` for full
    Segment-Spec-shaped properties
  - Identity: destination-level + per-event `settings.identify` resolving to
    `{ userId, traits, anonymousId }`. Runtime state diffing skips redundant
    `identify()` calls.
  - Groups: `settings.group` and per-event `mapping.settings.group` with
    reserved Segment group trait names
  - Page views: first-class `mapping.settings.page` →
    `analytics.page(category, name, properties)` (explicit configuration, no
    auto-detection)
  - Reset: `settings.reset: true` calls `analytics.reset()` on logout
  - Consent context forwarding: walkerOS consent state is automatically stamped
    as `context.consent.categoryPreferences` on every track, identify, group,
    and page call when `settings.consent` is configured, with optional key
    remapping (e.g. walkerOS `marketing` → Segment `Advertising`)
  - Deferred-load consent pattern: when `config.consent` is declared,
    `AnalyticsBrowser.load()` is held until `on('consent')` fires with all
    required keys granted
  - Ecommerce: walkerOS `mapping.name` + `mapping.data` produce Segment Spec
    event names (e.g. `Order Completed`) with a `products` array property — a
    single `track()` call per order, not a loop
  - SDK resolution follows the `env?.analytics ?? realSegment` pattern (mirrors
    `@walkeros/web-destination-clarity`)
  - Plugins, source middleware, and destination middleware are explicitly out of
    scope for v1 (JavaScript functions cannot be serialized in JSON flow configs
    — register them programmatically on the returned `AnalyticsBrowser` instance
    if needed)
  - `alias()` and `screen()` are intentionally deferred (legacy / mobile-only)

### Patch Changes

- @walkeros/web-core@3.3.0
