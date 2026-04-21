# @walkeros/web-source-session

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

- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0
  - @walkeros/web-core@3.4.0

## 3.3.1

### Patch Changes

- @walkeros/core@3.3.1
- @walkeros/web-core@3.3.1

## 3.3.0

### Patch Changes

- 08c365a: Expand `getMarketingParameters` to recognise 25+ ad platform click
  IDs (Pinterest, Reddit, Quora, Yandex, Outbrain, Taboola, Mailchimp, Klaviyo,
  HubSpot, Adobe, Impact, CJ, Branch, plus Google's `wbraid`/`gbraid`). Add a
  new `platform` field that resolves the click ID to a canonical platform
  identifier (e.g. `gclid` → `google`, `fbclid` → `meta`). Multi-click-ID URLs
  are resolved deterministically via a priority order.

  Custom click-ID registries can be passed as the third argument to
  `getMarketingParameters`, or via the new `clickIds` field in the session
  source settings — so flow.json users can extend or override defaults without
  touching code.

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0
  - @walkeros/web-core@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
  - @walkeros/core@3.2.0
  - @walkeros/web-core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1
- @walkeros/web-core@3.1.1

## 3.1.0

### Minor Changes

- 956c337: Add createTrigger following unified Trigger.CreateFn interface. Step
  examples updated with trigger metadata.
- ff58828: Add env.window and env.document to session source Env interface.
  Session detection (window, storage, performance) now uses injected globals
  when provided, enabling full simulation without a browser environment.

### Patch Changes

- Updated dependencies [ff58828]
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/web-core@3.1.0
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2
- @walkeros/web-core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1
- @walkeros/web-core@3.0.1

## 3.0.0

### Patch Changes

- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0
  - @walkeros/web-core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/web-core@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

- 60f0a1c: Add setup functions and renderer metadata for source simulation
- Updated dependencies [7fc4cee]
- Updated dependencies [7fc4cee]
- Updated dependencies [cb2da05]
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [026c412]
- Updated dependencies [7d38d9d]
  - @walkeros/core@2.1.0
  - @walkeros/web-core@2.1.0

## 2.0.1

## 1.1.4

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0
  - @walkeros/web-core@2.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0
  - @walkeros/web-core@1.0.5

## 1.1.2

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2
  - @walkeros/web-core@1.0.4

## 1.1.1

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1
  - @walkeros/web-core@1.0.3

## 1.1.0

### Minor Changes

- a38d791: Session detection extracted to standalone sourceSession
  - New `sourceSession` for composable session management
  - Browser source no longer includes session by default
  - To restore previous behavior, add sourceSession alongside browser source:

  ```typescript
  sources: {
    browser: sourceBrowser,
    session: { code: sourceSession, config: { storage: true } }
  }
  ```

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0
  - @walkeros/web-core@1.0.2
