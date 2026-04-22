# @walkeros/explorer

## 3.4.2

### Patch Changes

- @walkeros/collector@3.4.2
- @walkeros/core@3.4.2
- @walkeros/web-source-browser@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
  - @walkeros/core@3.4.1
  - @walkeros/collector@3.4.1
  - @walkeros/web-source-browser@3.4.1

## 3.4.0

### Minor Changes

- 496d4c0: `<CodeBox>` and `<LiveCode>` now run with Monaco configured to
  `target: ES2022`, `module: ESNext`, `moduleDetection: 'force'`, and a
  registered ambient declarations file exposing walkerOS runtime globals (`elb`,
  `getMappingEvent`, `getMappingValue`). Mapping snippets can be plain object
  literals or top-level `await` calls — no `import` / `export` boilerplate
  required — while keeping full IntelliSense via the existing `@walkeros/core`
  type registration.

  `<LiveCode>` now renders its result panel as JSON (it's always vendor output,
  regardless of the input language) and its config panel as JSON (it's always
  data). Only the input panel respects the `language` prop.

- fdf8d40: Add `CodeView` (Shiki-backed read-only code display) with matching
  `Box` frame, plus a `CodeStatic` atom as the underlying highlighter. Also
  suppress the Monaco loader's `{type: 'cancelation'}` unhandled rejections
  globally via a single window-level listener, fixing the dev-console noise that
  fired on every unmount of a `<CodeBox>` consumer.

### Patch Changes

- 15feda1: Harden the Monaco / CodeBox integration. Fix `moduleDetection`
  (Force), add `<LiveCode>` `configLanguage` prop, guard `ScriptTarget.ES2022`
  fallback, warn on `loader.init()` failures in dev, drop dead code. No API
  change for existing callers.
- Updated dependencies [74940cc]
- Updated dependencies [724f97e]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0
  - @walkeros/web-source-browser@3.4.0
  - @walkeros/collector@3.4.0

## 3.3.1

### Patch Changes

- Updated dependencies [b10144a]
- Updated dependencies [206185a]
- Updated dependencies [50e5d09]
- Updated dependencies [32ff626]
  - @walkeros/collector@3.3.1
  - @walkeros/web-source-browser@3.3.1
  - @walkeros/core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0
  - @walkeros/collector@3.3.0
  - @walkeros/web-source-browser@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [8cdc0bb]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
- Updated dependencies [a5d25bc]
- Updated dependencies [9a99298]
- Updated dependencies [884527d]
  - @walkeros/core@3.2.0
  - @walkeros/collector@3.2.0
  - @walkeros/web-source-browser@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1
- @walkeros/collector@3.1.1
- @walkeros/web-source-browser@3.1.1

## 3.1.0

### Patch Changes

- Updated dependencies [a9149e4]
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/web-source-browser@3.1.0
  - @walkeros/collector@3.1.0
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2
- @walkeros/collector@3.0.2
- @walkeros/web-source-browser@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1
- @walkeros/collector@3.0.1
- @walkeros/web-source-browser@3.0.1

## 3.0.0

### Minor Changes

- 268e8c3: Add $contract IntelliSense completions and contract-aware mapping
  value completions
- e0fd43c: Export enrichFlowConfigSchema, getVariablesSchema, and
  getEnrichedContractSchema utilities for Monaco JSON schema enrichment in
  external apps.

### Patch Changes

- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [a30095c]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [a2aa491]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0
  - @walkeros/collector@3.0.0
  - @walkeros/web-source-browser@3.0.0

## 2.1.5

### Patch Changes

- bdf5bf6: Moved @walkeros/explorer into walkerOS monorepo. Changed license to
  MIT.
- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/collector@2.1.1
  - @walkeros/web-source-browser@2.1.1
