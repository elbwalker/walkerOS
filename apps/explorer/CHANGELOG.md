# @walkeros/explorer

## 4.0.0

### Major Changes

- 942a7fe: Flow v4: type redesign and cross-flow references.

  Breaking changes:
  - Renamed `Flow.Settings` (single-flow shape) to `Flow`. The new
    `Flow.Settings` is the arbitrary kv-bag inside `Flow.Config` (matches
    `Destination.Settings` semantics).
  - Renamed `Flow.Config` (root file shape) to `Flow.Json`.
  - Removed `Flow.Web` and `Flow.Server`. Replaced by
    `config.platform: 'web' | 'server'` (a string discriminator).
  - Renamed `Flow.InlineCode` to `Flow.Code`.
  - Renamed `Flow.SourceReference` / `DestinationReference` /
    `TransformerReference` / `StoreReference` to `Flow.Source` / `Destination` /
    `Transformer` / `Store` (Reference suffix dropped).
  - Renamed `Flow.ContractEntry` to `Flow.ContractRule`.
  - Lifted `bundle` and platform fields into the per-flow `config` block.
  - `flow.json` `version` bumped from 3 to 4. v3 input is rejected (no compat
    shim).

  New:
  - `$flow.X.Y` reference resolves to `flows.X.config.Y` in the same file.
    Useful for linking a web flow's API destination to a server flow's deployed
    URL without duplicating values.
  - Per-flow `Flow.Config` block: `{ platform, url, settings, bundle }`.
  - `walkeros validate` warns on unresolved `$flow.X.Y` (use `--strict` to
    error). `walkeros bundle` and `walkeros deploy` always error on unresolved
    refs.
  - See `docs/migrating/v3-to-v4.mdx` on the website for the manual migration
    steps. No automated codemod is shipped.

### Minor Changes

- 8e06b1f: IntelliSense improvements for flow.json editors:
  - Chain references (`next` / `before`) now autocomplete in all forms: scalar,
    inline array, multi-line array, and Route[] inner `next`. Previously only
    the scalar form triggered.
  - `$store.` completions, hover, and validation added. Fed by a new optional
    `stores` field on `IntelliSenseContext`; the flow extractor collects store
    IDs from the active flow.
  - `$env.` completions and hover added. Optional `envNames` inventory on
    `IntelliSenseContext` enables validation; when absent, `$env.` still gets a
    generic hover.
  - `$contract.` completion now only triggers when the cursor starts a new
    string value, matching runtime semantics (whole-string refs only).
  - `package` completion detection is JSON-path aware — multi-line `"package":`
    values now surface completions.
  - Variables and definitions are collected at config / flow / step levels with
    correct cascade priority (step > flow > config).
  - Markers validate chain references in all forms via a JSON walk instead of a
    scalar-only regex.
  - Internals now import the shared `REF_*` regex constants from
    `@walkeros/core` — single source of truth, no inline duplicates.

- 465775c: Add Monaco IntelliSense for `$flow.X` cross-flow references in
  `Code`/`CodeBox`. Completion offers known sibling flow names from the parsed
  flow document, hover describes the resolved target, decorations style matches
  the other reference prefixes, and unknown flow names emit a warning marker.
  Re-export `REF_FLOW` from `@walkeros/core` so consumers can build inline regex
  tooling without reaching into the subpath.
- cfc7469: **Breaking — `@walkeros/core`:** `fetchPackage(name, { baseUrl })`
  now expects the host app to expose the v2 `/api/packages/[name]` endpoint that
  returns the merged `WalkerOSPackage` shape directly (single round-trip,
  `?expand=all`). The previous two-fetch pattern (`?path=package.json` +
  `?path=dist/walkerOS.json`) is removed. Hosts must serve the v2 shape; the
  offline jsdelivr fallback is unchanged.

  **Feature — CLI/MCP/explorer:** Outbound walkerOS-aware HTTP clients now
  identify themselves to the configured app origin via
  `X-Walkeros-Client: walkeros-{cli|mcp}/{version}`. `@walkeros/explorer`
  exports `setPackageTypesBaseUrl(url?)` so host apps can proxy `.d.ts` through
  their own origin (used by the walkerOS Tag Manager app to drop the jsdelivr
  CDN allowance entirely).

- 8e06b1f: **BREAKING:** Unified reference syntax: `$store:id` and
  `$secret:NAME` now use the dot separator: `$store.id` and `$secret.NAME`.

  The coherent rule across every walkerOS reference is:
  - **`.`** key or path (resolver looks up or walks what follows)
  - **`:`** literal value or raw-code payload (resolver uses what follows
    verbatim)

  `$var.`, `$def.`, `$env.NAME[:default]`, `$contract.`, and `$code:(…)` are
  unchanged, they already fit the rule.

  Every shipped example, published `walkerOS.json` metadata, doc page, and skill
  has been updated. A new canonical reference-syntax guide lives at
  `/docs/guides/reference-syntax`. Regex constants (`REF_VAR`, `REF_DEF`,
  `REF_ENV`, `REF_CONTRACT`, `REF_STORE`, `REF_SECRET`, `REF_CODE_PREFIX`) are
  exported from `@walkeros/core` import these instead of hand-rolling regexes.

  ### Upgrade

  Search-and-replace across your flow configs:

  ```
  $store:<id>      → $store.<id>
  $secret:<NAME>   → $secret.<NAME>
  ```

  Everything else stays the same. Your `$var.*`, `$def.*`, `$env.*`,
  `$contract.*`, and `$code:*` references need no changes.

### Patch Changes

- 8d3c18e: Add `CodeDiff` atom and `CodeDiffBox` molecule — read-only,
  theme-aware Monaco `DiffEditor` wrappers for side-by-side / inline code diff
  viewing. `CodeDiffBox` mirrors `CodeBox`'s API (header, actions, traffic
  lights, footer) and adds an opt-in summary strip, split/inline toggle, and
  copy button. Supports any Monaco language; walkerOS `$var:` / `$secret:`
  decorations are applied to both sides automatically.
- 8e06b1f: `PropertyTable` — responsive card-view fallback via CSS container
  queries (triggered below 420px), graceful empty-state rendering with an
  optional `emptyMessage` prop (default: "No specific properties available."),
  and improved column-width handling so the Description column no longer forces
  horizontal overflow in narrow containers.
- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/core@4.0.0
  - @walkeros/collector@4.0.0
  - @walkeros/web-source-browser@4.0.0

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
