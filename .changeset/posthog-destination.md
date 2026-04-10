---
'@walkeros/web-destination-posthog': minor
---

Add PostHog web destination (`@walkeros/web-destination-posthog`) — product
analytics, identity with `$set`/`$set_once` person properties, groups, logout
via reset, consent opt-in/opt-out, plus passthrough for all built-in PostHog
features (session replay, feature flags, surveys, heatmaps, error tracking) via
the official `posthog-js` npm package.

- Default event forwarding: every walkerOS event becomes
  `posthog.capture(name, properties)`
- Custom event properties: `settings.include` flattens walkerOS event sections
  with prefix (`data_*`, `globals_*`, etc.)
- Identity: destination-level + per-event `settings.identify`, resolving to
  `{ distinctId?, $set?, $set_once? }`. With `distinctId`: `posthog.identify()`.
  Without `distinctId`: `posthog.setPersonProperties()` (property-only updates).
  Runtime state diffing skips redundant `identify()` calls when `distinctId`
  hasn't changed.
- Groups: `settings.group` for B2B workflows — destination-level or per-event,
  tracked in runtime state
- Reset: `settings.reset: true` calls `posthog.reset()` on logout
- Consent: `on('consent')` handler derives the consent key from `config.consent`
  and toggles `posthog.opt_in_capturing()`/`opt_out_capturing()`
- Built-in features (config passthrough, no destination code): session
  recording, feature flags, surveys, heatmaps, exceptions, cookieless mode,
  bootstrap
- walkerOS defaults override PostHog defaults: `autocapture: false`,
  `capture_pageview: false`, `capture_pageleave: false` — walkerOS sources
  handle event capture
- SDK resolution follows the `env?.posthog ?? posthog` pattern (mirrors
  `@walkeros/web-destination-clarity` and `@walkeros/server-destination-gcp`
  BigQuery)
