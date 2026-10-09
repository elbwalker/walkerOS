# @walkeros/explorer

## 4.8.0

### Minor Changes

- bf6221f: Explorer now ships the walkerOS design system. Import
  `@walkeros/explorer/design/tokens.css` for colour, type, spacing, radius and
  layer tokens (dark by default, light under `data-theme="light"`), the opt-in
  `design/base.css`, the Tailwind v4 bridge `design/tailwind.css`, and typed
  colour and font constants from `@walkeros/explorer/design`. A
  `walkeros-design-check` command lints consuming code. Existing exports are
  unchanged.
- aa4bb8b: Add `Playground`: a tagged component, its event, an editable mapping
  and the resulting gtag call side by side, on one real flow (`startFlow`, the
  browser source scoped to a shadow root, and the gtag destination with a
  stubbed `gtag`). `@walkeros/web-destination-gtag` is now a runtime dependency.

### Patch Changes

- 7132619: `@walkeros/explorer/design/components` gains `BrowserFrame`, a
  browser window on the site theme around any page: an address field with the
  URL, an optional reload button, a slot for the caller's actions and an
  optional bookmarks row that marks the current page. It is sized by its caller
  and styled by `@walkeros/explorer/styles.css`. `Icon` gains `lock`, `reload`
  and `bookmark`.
- d5cbc9c: New `@walkeros/explorer/design/components` export with `Button`,
  `InlineCode` and `EventLegend`, styled by `@walkeros/explorer/styles.css`.
  `Button` forwards tagging attributes to its element and accepts a router link
  component.
- d5cbc9c: `@walkeros/explorer/design/components` gains the building blocks of
  the walkerOS home page: `Icon`, `InstallCommand`, `Card`, `Eyebrow`, `Stat`,
  `Text`, `TextLink`, `CheckList`, `SectionHeading`, `ProblemCard`,
  `FeatureItem`, `FaqItem`, `PlanCard`, `CaseCard`, `HighlightCard`, `Section`,
  `CardGrid`, `Split`, `Cluster`, `Hero`, and the three home page demos
  (`HeroTaggingViz`, `ArticleTeaserTracking`, `DestinationMappingViz`). Every
  design component forwards tagging attributes to its root.
- 01d86a5: Explorer components now read the walkerOS design tokens: import
  `@walkeros/explorer/design/tokens.css` beside `styles.css`. The old theme
  variables (`--bg-box`, `--color-text` and the rest) are removed. Code panels
  are dark in both page themes. Removed exports: `lighthouseTheme`,
  `registerLighthouseTheme`, `palenightTheme`, `registerPalenightTheme`, type
  `ExplorerTheme`, and `registerAllThemes`, replaced by `registerTheme`.
  `ELB_THEME_DARK` is now exported.
- d5cbc9c: `@walkeros/explorer/design/tokens.css` now declares every type style
  as CSS variables: `--type-<style>-size`, `-line-height`, `-weight`, `-family`
  and, when the style sets one, `-tracking`. Components can take sizes and
  weights from the design system instead of fixed values.
- 7132619: The `PromotionPlayground` and `LiveCode` mapping examples show events
  and results again, and every failure says so in the box it concerns. `Preview`
  takes a `collector` instead of `elb` and captures the page's events through
  it; its document carries the design tokens, base rules and design atom styles,
  so the demo product card is built from `Card`, `PhotoPlaceholder`, `Text` and
  `Button`. The Playground drops its separate Code box and the `labelCode` prop:
  the Preview's HTML, CSS and JS tabs edit the page. New props: `placeholder`
  and `error` on `CodeBox`, `error` on `Box`, `boxWidth` on `Grid` for one row
  of fixed-width boxes.
- 7132619: New `ViewSource` component: wrap a tagged element, hover it and
  toggle to its live HTML with the `data-elb` attributes, edited in place. Back
  in Visual the element renders your edit and walkerOS picks up the new tags; a
  Reset icon restores the original. New `ToggleButton`: one button that names
  the option a click switches to, at a fixed width.
- a4b03ba: The five event colours (globals, context, entity, property, action)
  now have a light-theme value that reads as text on light backgrounds. Their
  constants in `@walkeros/explorer/design` are now `{ dark, light }` objects,
  like every other themed colour; read `.dark` where the colour sits on a dark
  ground.
- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
- Updated dependencies [5593d7b]
  - @walkeros/core@4.8.0
  - @walkeros/web-destination-gtag@4.8.0
  - @walkeros/collector@4.8.0
  - @walkeros/web-core@4.8.0
  - @walkeros/web-source-browser@4.8.0

## 4.7.2

### Patch Changes

- 98398fe: Importing explorer no longer downloads the Monaco editor. Monaco now
  loads when the first code editor appears on a page, so pages without an editor
  stay light. Editors keep their themes, type checking and autocompletion.
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/web-core@4.7.2
  - @walkeros/web-source-browser@4.7.2
  - @walkeros/collector@4.7.2

## 4.7.1

### Patch Changes

- dbc172c: Read-only code boxes (`CodeView`, `CodeSnippet`) now size to their
  content instead of a fixed height, and snippets show a copy button. New
  `StepExample` shows a step's event, mapping and output side by side, wrapping
  to a stack on narrow screens. `Grid` now honors `columns`: at most that many
  boxes per row, the rest wrap.
- 91e9aeb: Read-only code blocks (`CodeView`, `CodeSnippet`, `StepExample`) now
  name their language on the rendered `<code>` element, so Markdown converted
  from the page keeps each code fence's language, including languages that
  render as plain text.
- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
  - @walkeros/web-core@4.7.1
  - @walkeros/web-source-browser@4.7.1
  - @walkeros/collector@4.7.1
  - @walkeros/core@4.7.1

## 4.7.0

### Minor Changes

- 74821ed: New `collector.next`: a transformer chain run once per event before
  the destinations; a `stop` there drops it for all of them. Routes in every
  chain field can drop an event with `{ stop: true }`, optionally gated by
  `match`. A route `match` reads `{ ingest, event }` when the event reaches it.
  New `getRouteGraph`; `getNextSteps(spec, root)` requires its root.

### Patch Changes

- Updated dependencies [786a860]
- Updated dependencies [c9ea71f]
- Updated dependencies [ef02916]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [7e5e3de]
- Updated dependencies [b9668bf]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [050d776]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/collector@4.7.0
  - @walkeros/web-source-browser@4.7.0
  - @walkeros/core@4.7.0
  - @walkeros/web-core@4.7.0

## 4.6.1

### Patch Changes

- @walkeros/collector@4.6.1
- @walkeros/core@4.6.1
- @walkeros/web-core@4.6.1
- @walkeros/web-source-browser@4.6.1

## 4.6.0

### Patch Changes

- Updated dependencies [8802281]
  - @walkeros/collector@4.6.0
  - @walkeros/web-source-browser@4.6.0
  - @walkeros/core@4.6.0
  - @walkeros/web-core@4.6.0

## 4.5.0

### Patch Changes

- Updated dependencies [63845bb]
- Updated dependencies [79cdcb0]
- Updated dependencies [756b571]
  - @walkeros/core@4.5.0
  - @walkeros/collector@4.5.0
  - @walkeros/web-core@4.5.0
  - @walkeros/web-source-browser@4.5.0

## 4.4.0

### Patch Changes

- Updated dependencies [393b942]
- Updated dependencies [6c89afb]
- Updated dependencies [393b942]
- Updated dependencies [35756dd]
- Updated dependencies [e896a7f]
- Updated dependencies [034b1de]
- Updated dependencies [d00e2bd]
- Updated dependencies [87937a8]
  - @walkeros/collector@4.4.0
  - @walkeros/core@4.4.0
  - @walkeros/web-source-browser@4.4.0
  - @walkeros/web-core@4.4.0

## 4.3.2

### Patch Changes

- @walkeros/collector@4.3.2
- @walkeros/core@4.3.2
- @walkeros/web-core@4.3.2
- @walkeros/web-source-browser@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/collector@4.3.1
  - @walkeros/web-core@4.3.1
  - @walkeros/web-source-browser@4.3.1

## 4.3.0

### Minor Changes

- db6309c: Removed the experimental `TagSkeleton`, `TagSkeletonOverlay`,
  `TagCanvas`, `TagTreeEditor` and `Tag` components, along with their layout and
  tag-tree helpers. The draft tagging-plan visualization they prototyped is no
  longer part of this package.

### Patch Changes

- c201c5f: Read-only code snippets now render their highlighted content during
  server-side rendering instead of waiting for the browser, so code is visible
  on first paint and in no-JS and search-engine contexts. `CodeSnippet` no
  longer ships the Monaco editor for read-only display.
- Updated dependencies [7527c41]
- Updated dependencies [9506e3e]
- Updated dependencies [ebd193f]
- Updated dependencies [e01036e]
- Updated dependencies [83ea3c6]
- Updated dependencies [66a8c33]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [e6613f8]
- Updated dependencies [ebd193f]
  - @walkeros/web-source-browser@4.3.0
  - @walkeros/web-core@4.3.0
  - @walkeros/collector@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [bd9188d]
- Updated dependencies [d8aebd1]
- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
- Updated dependencies [8afb7cc]
  - @walkeros/collector@4.2.1
  - @walkeros/core@4.2.1
  - @walkeros/web-source-browser@4.2.1
  - @walkeros/web-core@4.2.1

## 4.2.0

### Minor Changes

- 560d8af: Add a unified tag visualization: the `Tag` atom plus `TagCanvas` and
  `TagTreeEditor`. It renders walkerOS data-elb tagging as nested rectangles
  (entity, context, global, action, property) with an auto-laid-out reading view
  and an overlay you can draw onto a screenshot. The overlay editor supports
  dragging and resizing rectangles, keeping every tag fully nested or fully
  separate. The existing `TagSkeleton` and `TagSkeletonOverlay` continue to
  work.

### Patch Changes

- 2d64ed2: CodeBox now memoizes its toolbar and tabs so a validation-marker
  update repaints only the error and warning badges instead of re-rendering the
  whole editor. This removes the visible editor flicker when content or markers
  change rapidly.
- 560d8af: The built bundle now preserves its leading `"use client"` directive,
  so Next.js treats the package as a client boundary. The minifier could
  previously strip it, which broke server components that import the package at
  build time.
- Updated dependencies [76d32c1]
- Updated dependencies [5b1a134]
- Updated dependencies [5b1a134]
- Updated dependencies [908d6f0]
- Updated dependencies [654ba38]
- Updated dependencies [c27d3c1]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [776e5f9]
- Updated dependencies [c27d3c1]
- Updated dependencies [126c0f1]
- Updated dependencies [654ba38]
- Updated dependencies [21ac669]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
  - @walkeros/collector@4.2.0
  - @walkeros/web-source-browser@4.2.0
  - @walkeros/web-core@4.2.0

## 4.1.2

### Patch Changes

- Updated dependencies [b506f2c]
  - @walkeros/web-source-browser@4.1.2
  - @walkeros/collector@4.1.2
  - @walkeros/core@4.1.2
  - @walkeros/web-core@4.1.2

## 4.1.1

### Patch Changes

- b0279ee: Export the `$`-ref completion builders (`getVariableCompletions`,
  `getEnvCompletions`, `getStoreCompletions`, `getFlowCompletions`,
  `getSecretCompletions`) and the `CompletionEntry` type from the package barrel
  so custom inputs can reuse them outside Monaco.
- b0279ee: Export `getMappingPathCompletions` and `getContractCompletions` so
  custom form inputs can seed contract-driven path and `$contract` reference
  suggestions outside Monaco. Add `allowedRefKinds` (the cursor-scoped `$`-ref
  gate, now covering `$contract`) and `getJsonPathAtOffset`, and gate the open
  `$` completion fallback by the same scope rule so Monaco offers only the ref
  kinds valid at the cursor.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
- Updated dependencies [edd3836]
- Updated dependencies [edd3836]
  - @walkeros/core@4.1.1
  - @walkeros/collector@4.1.1
  - @walkeros/web-core@4.1.1
  - @walkeros/web-source-browser@4.1.1

## 4.1.0

### Minor Changes

- 058f7ed: Add `validateJsonSchema` / `validateEventsJsonSchema` exports for
  step-level validation config, promote the validate and no-`many` route schemas
  to direct exports, and add optional `nodeType` / `subPath` cursor fields to
  `IntelliSenseContext` for context-scoped autocomplete.

### Patch Changes

- c60ef35: Remove unused legacy fields `batchFn` and `batched` from
  `Mapping.Rule`. Batch state lives on the destination via `BatchRegistry`,
  never on mapping rules. No runtime impact.
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
- Updated dependencies [6cdc362]
- Updated dependencies [e800974]
- Updated dependencies [e800974]
- Updated dependencies [058f7ed]
- Updated dependencies [28a8ac2]
- Updated dependencies [fd6076e]
  - @walkeros/core@4.1.0
  - @walkeros/collector@4.1.0
  - @walkeros/web-source-browser@4.1.0
  - @walkeros/web-core@4.1.0

## 4.0.2

### Patch Changes

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2
  - @walkeros/collector@4.0.2
  - @walkeros/web-source-browser@4.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [cb265eb]
- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/collector@4.0.1
  - @walkeros/core@4.0.1
  - @walkeros/web-source-browser@4.0.1

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
