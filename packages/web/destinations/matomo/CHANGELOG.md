# @walkeros/web-destination-matomo

## 4.8.2

### Patch Changes

- 2374f54: An event that no rule maps fails with `missing-input` instead of a
  warning. An invalid `goalId` sends the hit without the goal and logs one ERROR
  per cause. A consent revocation sends `forgetConsentGiven`, stopping link
  tracking too, and silent rules send only their goal.
- 2374f54: A destination with `config.consent` now tells the vendor about
  consent changes: Meta calls `fbq('consent', 'revoke' | 'grant')`, Matomo
  `forgetConsentGiven` and `setConsentGiven`, Clarity sends ConsentV2, FullStory
  stops and starts capture, and Piwik PRO turns off the link tracking it
  enabled.
- 2374f54: A failed vendor call, a missing required setting (`config`) and an
  event that cannot be sent (`missing-input`) are reported as failed pushes,
  with the dead-letter queue and one ERROR line, instead of counting as
  delivered. Rules with `silent: true` send no event. Settings schemas reject
  unknown keys.
- b1d65e2: Web destinations that load a vendor script inject it through the
  document of their `env`, so simulation and server-side rendering work without
  a browser page. A page still gets the script in its own document by default,
  and a missing document fails the push with `vendor-not-ready`.
- 2374f54: Vendor scripts load through walkerOS: a blocked or slow script fails
  later events visibly (`vendor-not-loaded`, `vendor-timeout`) instead of losing
  them. Pushes made while the script loads wait for it, and each script is
  injected once per page.
- Updated dependencies [2374f54]
- Updated dependencies [7e5fc27]
- Updated dependencies [2374f54]
- Updated dependencies [964590a]
- Updated dependencies [4100ede]
- Updated dependencies [2374f54]
- Updated dependencies [2374f54]
- Updated dependencies [15eb7b2]
- Updated dependencies [33a2779]
- Updated dependencies [33a2779]
- Updated dependencies [b1d65e2]
- Updated dependencies [964590a]
- Updated dependencies [2374f54]
  - @walkeros/core@4.8.2
  - @walkeros/web-core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1
  - @walkeros/web-core@4.8.1

## 4.8.0

### Patch Changes

- 5593d7b: The ecommerce step examples are no longer published in the docs, and
  their descriptions say they are test fixtures. Matomo needs an
  `addEcommerceItem` call per product before a cart update, and before an order
  to record its products, and tracks a product view as `setEcommerceView`
  followed by a page view. One rule sends one command.
- 5593d7b: The ecommerce step examples now test for a product entity without a
  package helper. The published condition, shown in the docs and returned by
  `package_get`, referenced a minified import and threw when copied into a flow;
  it now runs on its own.
- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0
  - @walkeros/web-core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/web-core@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
  - @walkeros/web-core@4.7.1
  - @walkeros/core@4.7.1

## 4.7.0

### Patch Changes

- 74821ed: Piwik PRO and Matomo web destinations: a page view rule with a goal
  still tracks the page view, unmapped events are skipped with a warning, and
  `url` plus `appId`/`siteId` are required only with `loadScript`. Piwik PRO
  adds custom dimensions and an `identified` setting for cookieless tracking;
  Matomo dimensions no longer leak into later hits.
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/core@4.7.0
  - @walkeros/web-core@4.7.0

## 4.6.1

### Patch Changes

- @walkeros/core@4.6.1
- @walkeros/web-core@4.6.1

## 4.6.0

### Patch Changes

- @walkeros/core@4.6.0
- @walkeros/web-core@4.6.0

## 4.5.0

### Patch Changes

- Updated dependencies [63845bb]
- Updated dependencies [79cdcb0]
- Updated dependencies [756b571]
  - @walkeros/core@4.5.0
  - @walkeros/web-core@4.5.0

## 4.4.0

### Patch Changes

- Updated dependencies [6c89afb]
- Updated dependencies [393b942]
- Updated dependencies [034b1de]
- Updated dependencies [d00e2bd]
  - @walkeros/core@4.4.0
  - @walkeros/web-core@4.4.0

## 4.3.2

### Patch Changes

- @walkeros/core@4.3.2
- @walkeros/web-core@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/web-core@4.3.1

## 4.3.0

### Patch Changes

- Updated dependencies [83ea3c6]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [ebd193f]
  - @walkeros/web-core@4.3.0
  - @walkeros/core@4.3.0

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

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2
  - @walkeros/web-core@4.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/core@4.0.1
  - @walkeros/web-core@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/core@4.0.0
  - @walkeros/web-core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/core@3.4.2
- @walkeros/web-core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
- Updated dependencies [caea905]
  - @walkeros/core@3.4.1
  - @walkeros/web-core@3.4.1

## 3.4.0

### Minor Changes

- 74940cc: Add Matomo web destination (self-hosted/cloud privacy-first
  analytics) via \_paq command queue with support for page views, custom events,
  ecommerce, goals, site search, content tracking, and custom dimensions
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

- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0
  - @walkeros/web-core@3.4.0
