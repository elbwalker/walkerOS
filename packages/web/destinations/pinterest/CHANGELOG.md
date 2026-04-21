# @walkeros/web-destination-pinterest

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

- 08c365a: Add Pinterest Tag web destination
  (`@walkeros/web-destination-pinterest`) — conversion tracking with the full
  Pinterest standard event taxonomy, enhanced matching via `em`/`external_id`,
  auto `event_id` deduplication, inline `line_items`, and consent-aware
  suppression. Loads `core.js` from Pinterest's CDN.
  - **Standard event taxonomy:** explicit `mapping.name` rename to Pinterest's
    lowercase concatenated names (`pagevisit`, `addtocart`, `checkout`,
    `viewcontent`, `lead`, `signup`, `search`, `custom`, ...).
  - **Inline `line_items` for multi-product:** single
    `pintrk('track', 'checkout', { line_items: [...] })` call (NOT N separate
    calls). Built via the standard walkerOS `loop` mapping syntax.
  - **Enhanced matching:** strict allow-list of `em` (email) and `external_id`.
    The Pinterest JS tag auto-hashes `em` with SHA-256 — the destination passes
    raw values through and never hashes. Per-push diff suppresses redundant
    `pintrk('set', ...)` calls.
  - **Auto `event_id` for dedup:** every `pintrk('track', ...)` call attaches
    the walkerOS event `id`, ready for cross-channel deduplication with a future
    server (Conversions API) destination.
  - **Currency fallback** via walkerOS `{ key, value }` syntax — defaults to
    `"EUR"`.
  - **Consent-aware suppression:** Pinterest has no vendor `opt_in`/`opt_out`
    API. `on('consent')` flips a runtime state flag, so subsequent track calls
    are suppressed silently after revocation.
  - **No npm SDK** — the destination injects the official Pinterest Tag from
    `https://s.pinimg.com/ct/core.js` at runtime.
  - **Covered features:** 11 step-example fixtures including default forward,
    wildcard ignore, page view rename, site search, single-product viewcontent,
    addtocart with inline line_items, multi-product checkout via loop, lead with
    identify, identify-only `mapping.skip`, and consent grant/revoke runtime
    suppression.

### Patch Changes

- @walkeros/web-core@3.3.0
