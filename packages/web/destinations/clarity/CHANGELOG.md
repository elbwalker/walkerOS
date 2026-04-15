# @walkeros/web-destination-clarity

## 3.3.1

### Patch Changes

- @walkeros/web-core@3.3.1

## 3.3.0

### Minor Changes

- 08c365a: Add Microsoft Clarity web destination
  (`@walkeros/web-destination-clarity`) — session replay, heatmaps, custom tags,
  identity, session priority, and consent translation via the official
  `@microsoft/clarity` SDK.
  - Default event forwarding: every walkerOS event becomes `Clarity.event(name)`
  - Custom tags: flatten sections with `settings.include` or define explicit
    maps with `mapping.settings.set` (supports `string` and `string[]` values
    natively)
  - Identity: mapping values resolve to positional `Clarity.identify(...)` args.
    Destination-level `settings.identify` fires on every push, matching
    Clarity's "identify on every page load" recommendation
  - Session priority: `mapping.settings.upgrade` fires `Clarity.upgrade(reason)`
  - Consent: explicit `settings.consent` table translates walkerOS consent keys
    to Clarity `ConsentV2` categories (`analytics_Storage`, `ad_Storage`). All
    consent state is forwarded via `Clarity.consentV2(...)` — the legacy
    `Clarity.consent(...)` API is intentionally not used.
  - Honours `mapping.skip` to run side effects without the default event call
  - Push execution order: identify → tags → upgrade → event, matching Clarity's
    own guidance
  - SDK resolution follows the `env?.clarity ?? Clarity` pattern (mirrors
    `@walkeros/server-destination-gcp` BigQuery wiring), so production uses the
    real imported SDK while tests inject a mock via `env.clarity`

### Patch Changes

- @walkeros/web-core@3.3.0
