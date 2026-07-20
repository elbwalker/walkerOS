# @walkeros/mcp

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [747e42f]
  - @walkeros/cli@4.3.1
  - @walkeros/core@4.3.1

## 4.3.0

### Minor Changes

- 1559e17: The `preview_regrant` action now works over the CLI-backed MCP
  client: mint a fresh, origin-bound activation grant for an existing preview,
  optionally bound to an Observe session via `sessionId`. `preview_create` with
  a `siteUrl` now mints a real activation grant instead of returning no
  activation URL.
- 98801c9: Flow observation records now assemble into per-event journeys
  spanning web and server flows, each hop showing input, output, and status,
  with loss flagged; the `observe_journeys` MCP tool exposes the same journeys
  to agents. Batching destinations now emit per-event records, and live-web
  vendor calls are captured when a destination reaches its callable through
  `getEnv`, though batched sends stay uncaptured.

### Patch Changes

- Updated dependencies [07f0255]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [1559e17]
- Updated dependencies [06c93b4]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
  - @walkeros/cli@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- b03bfce: The `deploy_manage` tool now matches its real behavior: `deploy`
  honors `wait`, `delete` removes an active deployment, and `list` accepts
  `cursor` and `limit` for pagination. A failed deployment surfaces its error
  reason so an assistant can report why a deploy did not succeed.
- Updated dependencies [b03bfce]
- Updated dependencies [ec84331]
- Updated dependencies [4809699]
- Updated dependencies [5cbcd23]
- Updated dependencies [5cbcd23]
- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
- Updated dependencies [8afb7cc]
  - @walkeros/cli@4.2.1
  - @walkeros/core@4.2.1

## 4.2.0

### Minor Changes

- 9d066cc: The MCP now loads flows by ID, requires the `flow_simulate` `step`
  parameter it always enforced, and adds a `diagnostics` tool reporting client
  and CLI versions plus backend reachability. Package discovery returns a
  complete catalog with a warning when a source degrades, instead of silently
  caching partial results, and returned flow configs are round-trip safe
  (structural values stay literal). The demo source can now be simulated as a
  source step; the CLI also exports `VERSION` and `resolveAppUrl` and clears a
  deleted default project.
- 6a72a32: The MCP `flow_simulate` and `flow_bundle` tools now accept a cloud
  flow id as `configPath`, so you can simulate or bundle a saved flow without a
  manual file round-trip, and repeated simulations reuse a prebuilt bundle for
  faster runs. Loading or fetching a flow with no default project set now
  returns a clear "no default project" error, and `flow_examples` surfaces a
  referenced package's shipped examples when a step has none inline. Bundle
  stats now report the real total bundle size and list package names instead of
  a per-package estimate, and the GA4 transformer documents its wiring contract
  via package hints.
- 9d066cc: Preview creation can now target a deployed version: pass
  `source: { kind: 'deployment-version', deploymentVersionId }` to
  `createPreview` (CLI) or the MCP `flow_manage` `preview_create` action to
  preview what's live instead of the flow's draft. Deleting a preview no longer
  errors on the empty `204 No Content` response and resolves to a confirmation
  record.
- e8f6909: Add a `secret_manage` MCP tool (and matching CLI functions) to manage
  a flow's secrets. List secret metadata, create, rotate, and delete secrets
  that flow steps reference as `$env.<NAME>`. Values are write-only: encrypted
  at rest and never returned or logged.

### Patch Changes

- 6a72a32: Source simulation gains a `collector` step that runs the real
  collector enrichment and returns the fully enriched event. Transformer
  simulation now accepts an optional raw `ingest` so request decoders like GA4
  can be tested standalone by supplying a `url`. The `flow_simulate` MCP tool
  accepts the new collector step and the transformer `ingest` input.
- Updated dependencies [e8f6909]
- Updated dependencies [76d32c1]
- Updated dependencies [654ba38]
- Updated dependencies [5b1a134]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [b98474f]
- Updated dependencies [59aa9e1]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [d39a6a1]
- Updated dependencies [9d066cc]
- Updated dependencies [6a72a32]
- Updated dependencies [9d066cc]
- Updated dependencies [c27d3c1]
- Updated dependencies [654ba38]
- Updated dependencies [e8f6909]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [e2a60ae]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/cli@4.2.0
  - @walkeros/core@4.2.0

## 4.1.2

### Patch Changes

- @walkeros/cli@4.1.2
- @walkeros/core@4.1.2

## 4.1.1

### Patch Changes

- ddcd56e: The project, flow, and deployment list operations now accept optional
  `cursor` and `limit` arguments and return a `nextCursor` to fetch the next
  page. Listing without these arguments is unchanged and returns all results. In
  the MCP, the `project_manage`, `flow_manage`, and `deploy_manage` tools expose
  `cursor` and `limit` on their `list` action.
- Updated dependencies [c1a4188]
- Updated dependencies [b0279ee]
- Updated dependencies [ddcd56e]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/cli@4.1.1
  - @walkeros/core@4.1.1

## 4.1.0

### Minor Changes

- b276173: **Breaking:** `code: "<exportName>"` is no longer accepted on any
  step. Replace with `import: "<exportName>"` alongside `package`.

  **New:** Every step (source, transformer, destination, store) accepts
  `import?: string`. With `package`, it selects a named export. `package` alone
  still loads the default export. Inline code stays
  `code: { push, type?, init? }`. Empty steps are valid no-ops. `flow_validate`
  and the CLI bundler raise `OBSOLETE_CODE_STRING` on the legacy shape with a
  precise rename hint.

- dd9f5ad: Pass-through transformer steps + closed-schema validation.

  **Validation:** `validateTransformerEntry` in `@walkeros/core` is now the
  single source of truth. Bundler, `flow_validate`, and collector runtime all
  delegate. Closed schema: unknown top-level keys are errors. `code` + `package`
  together is a `CONFLICT`.

  **Pass-through steps:** A transformer entry with no `code` and no `package` is
  valid; the collector synthesizes its push. Three variants:
  - before/next chain only (named hop)
  - cache only (e.g. dedup)
  - mapping only (event-to-event transform via `Mapping.Config`)

  **Mapping at the transformer position:** new `mapping?: Mapping.Config` field
  on `Transformer.Config` / `InitTransformer`. Same shape as
  `Destination.Config.mapping`, event-to-event semantic. `data` / `silent` are
  ignored at the transformer position with a one-time warning.

  **Engine tag:** synthesized instance now uses `type: 'pass'` (was `'path'`).
  Hard cut.

  **Runtime fixes:**
  - `compileNext` handles mixed-shape `next` arrays (`["a", { case }]`) via a
    new `'sequence'` variant.
  - A destination's `before` referencing a pass-through transformer now walks
    that transformer's own `before` / `next`.
  - `cache.stop: true` at a pre-collector transformer halts the pipeline
    (matches `cache.mdx`).

  **Migration:** Typo keys on a step now fail validation.
  `instance.type === 'path'` consumers must read `'pass'`. `runTransformerChain`
  consumers should branch on the new `stopped` flag.

- adeebea: Add `Flow.Store.cache` for store-level caching: read-through +
  write-through wrapper with single-flight dedup, recursive composition via
  `cache.store`, and per-wrapper counters. `CacheRule` is now a discriminated
  union (`EventCacheRule | StoreCacheRule`); schema rejects inert fields in
  store contexts.

  Built-in `__cache` upgraded with LRU, `maxEntries: 10000`, batched eviction,
  and active TTL sweep.

  **Breaking:** `@walkeros/store-memory` is removed. Its logic is absorbed into
  `__cache`. Migration: drop the store declaration, or omit `cache.store` to use
  the built-in tier. `flow_validate` flags legacy references.

### Patch Changes

- 1a8f2d7: Flow v4 routing & cache cleanup.

  **Cache:**
  - `cache.full` is renamed to `cache.stop`. Search-and-replace.
  - `cacheRule.match` is now optional. Omitted means always-match. The literal
    `'*'` is dropped from the schema and the TypeScript types; `compileMatcher`
    still tolerates the string at runtime for migration.
  - New `cache.namespace?: string` field. Omit to write keys directly to the
    store. Same store + same key + same namespace = same cache entry.
  - Implicit per-step namespace prefixes (`s:`, `t:`, `d:`) are removed. If you
    relied on them to separate same-keyed caches across
    sources/transformers/destinations using the same store, set
    `cache.namespace` explicitly.

  **Routing:**
  - Unified recursive `Route` type. A Route is `string | Route[] | RouteConfig`.
  - New `case` operator replaces the legacy `Route[]` first-match shape. The
    legacy shape is compiled as an implicit `{ case: [...] }` for runtime
    compatibility, but new configs should use `case` explicitly.
  - `RouteConfig` is a disjoint union enforced at the TypeScript type level via
    `never` fields: a single RouteConfig sets at most one of `next` / `case`. A
    bare `{ match }` is a gate (pass-through when the match fires, fall-through
    when it fails). JSON Schema validation currently emits `anyOf` and does not
    enforce disjointness at runtime — see follow-up notes.
  - Sequence sugar (`next: [A, B, C]`) is preserved.

  **Path:**
  - A transformer entry with no `code` is a `path` — a code-less passthrough.
    The engine synthesizes `(e) => ({ event: e })`. Use paths to name and share
    `before` chains across destinations. Validation: a path must declare at
    least one of `package`, `before`, `next`, or `cache`.

  **Schema & tooling:**
  - Updated Zod schemas (cache, route, matcher).
  - Updated MCP tool descriptions and resource references.
  - Updated `flow_validate` to enforce the new constraints (`EMPTY_TRANSFORMER`
    error code added).

  **Migration:** Hard cut at the schema/type level. Configs using `cache.full`
  will fail validation — rename to `stop`. Configs using `match: "*"` will fail
  validation — omit `match`. Configs using `Route[]` first-match still work at
  runtime (compiled as implicit `case`) but new configs should use `case`
  explicitly.

  `$schema: "v4"` is preserved. No version bump.

- adeebea: Route grammar: rename `case` to `one` (first-match dispatch) and add
  `many` (all-match parallel fan-out, pre-collector only). `many` terminates the
  main chain and is rejected at post-collector positions (`destination.before`,
  `destination.next`); use multiple destinations for post-collector fan-out.
  `RouteCaseConfig` is renamed to `RouteOneConfig`; no aliases.
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
  - @walkeros/cli@4.1.0

## 4.0.2

### Patch Changes

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2
  - @walkeros/cli@4.0.2

## 4.0.1

### Patch Changes

- 03d7055: Merge `definitions` into `variables`. Single concept, single syntax
  `$var.name(.deep.path)?`. Whole-string references preserve native type; inline
  interpolation requires scalars. Deep paths and recursive resolution with cycle
  detection now supported. `Flow.Definitions`, `Flow.Primitive`, and the `$def.`
  reference syntax are removed.
- Updated dependencies [abfb0bb]
- Updated dependencies [ed304b4]
- Updated dependencies [e4b6cf4]
- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/cli@4.0.1
  - @walkeros/core@4.0.1

## 4.0.0

### Major Changes

- 0ffb1d3: Remove dead `bundleRemote()` and add OpenAPI drift detection.

  Breaking changes:
  - Removed `bundleRemote()` export from `@walkeros/cli`. The corresponding
    `/api/bundle` endpoint was removed from the walkerOS app on 2026-04-08, so
    this function had been silently broken in production for ~3 weeks. Local
    bundling via `bundle()` is unaffected.
  - Removed `remote` and `content` options from the MCP `flow_bundle` tool. The
    tool now bundles locally only.

  New:
  - Added `npm run -w @walkeros/cli validate:openapi-spec` script that diffs the
    checked-in `packages/cli/openapi/spec.json` against the live app's OpenAPI
    document. Detects drift between the walkerOS-side type contract and the
    actual API. Wired into PR-time CI, daily cron, and a pre-commit lint-staged
    hook. All layers are gated on a `WALKEROS_APP_URL` secret and skip silently
    when unset, so the change ships safely without configuration. To activate:
    set `WALKEROS_APP_URL` in repo secrets pointing to a deployed app instance.

- 93ea9c4: Event model v4: breaking changes to the `Event`, `Source`, and
  `Entity` shapes.
  - `event.id` is now a W3C span_id (16 lowercase hex chars), generated by the
    collector. Reference: W3C Trace Context (W3C Recommendation, January 2020).
  - `event.version`, `event.group`, `event.count` are removed.
  - `source.type` is now the source kind (e.g. `browser`, `gtag`, `mcp`, `cli`).
    New `source.platform` holds the runtime (`web` | `server` | `app` | ...).
  - `source.id` and `source.previous_id` are removed.
  - Browser source now sets `source.url` and `source.referrer`.
  - MCP source sets `source.tool` per emission. CLI source sets
    `source.command`.
  - `Entity.nested` and `Entity.context` are now optional. Root `event.nested`
    and `event.context` remain required.
  - Each source self-registers via TypeScript module augmentation of `SourceMap`
    in `@walkeros/core`.
  - App-side coordination (`/workspaces/developer/app`) is a follow-up plan, not
    part of this release. Telemetry from v4 CLI/MCP will not validate against
    the existing app schema until that follow-up ships.
  - `Mapping.Rule.skip` is renamed to `Mapping.Rule.silent`. Customer flow.json
    configs using `skip: true` in mapping rules must rename to `silent: true`.
    Hard cut: no legacy alias, the field is gone.

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

- 78b651a: Explicit opt-in anonymous usage telemetry for CLI and MCP. Telemetry
  is off by default; users opt in with `walkeros telemetry enable` and out with
  `walkeros telemetry disable`. No persistent identifier is written before
  opt-in. No ingest endpoint ships in this release: opting in records consent
  locally; emission begins when a managed endpoint is released. The data
  contract lives at `packages/cli/src/telemetry/flow.json`.
- 6422b9b: Add `flowId` filter to CLI `listDeployments` and redesign the MCP
  `deploy_manage` tool around it.

  **CLI (`@walkeros/cli`):**
  - `listDeployments({ projectId?, type?, status?, flowId? })` now forwards
    `flowId` as a query parameter to `GET /api/projects/{id}/deployments`.
  - New helper `deleteDeploymentByFlowId({ projectId?, flowId, slug? })` deletes
    the active deployment for a flow, surfacing a `DeploymentAmbiguityError`
    (code `MULTIPLE_DEPLOYMENTS`, with a `details[]` list) when a flow has more
    than one active deployment and no slug was supplied.

  **MCP (`@walkeros/mcp`) breaking:**
  - `deploy_manage`'s `get`, `delete`, and `list` actions now take
    `{ projectId?, flowId, slug? }`. The old `id` parameter has been removed.
    `flowId` is required for `get`/`delete` and optional for `list`.
    Soft-deleted deployments are always excluded.
  - When a flow has multiple active deployments and `slug` is not provided,
    `get`/`delete` return a `MULTIPLE_DEPLOYMENTS` error with a `details[]` list
    of `{ slug, type, status, updatedAt }` entries so the caller can pick one.
    `deploy` action is unchanged.

- c9f55cc: Add `flowCanvasResult` helper + `FlowCanvasToolResult` /
  `FlowCanvasPayload` / `SuggestionTile` types for UI-renderable tool outputs.
  `flow_manage` actions `get` / `create` / `update` now return a
  `kind: 'flow-canvas'` payload with optional suggestion tiles so chat clients
  can render the flow graph inline.
- 6afa2fd: Split `@walkeros/mcp` into a library entry (server factory plus
  `ToolClient` abstraction) and a thin stdio binary. The package now exports
  `createWalkerOSMcpServer`, `HttpToolClient`, `createStreamableHttpHandler`,
  `TOOL_DEFINITIONS`, and the `ToolClient` interface so host applications can
  mount walkerOS MCP tools over HTTP (e.g. from a Next.js Route Handler) or
  consume them directly from non-MCP runtimes (e.g. Vercel AI SDK adapters). The
  `walkeros-mcp` stdio binary is unchanged for end users; importing
  `@walkeros/mcp` programmatically no longer auto-starts stdio.
- c9f55cc: Tool handlers now wrap user-writable strings (flow/project names,
  config fields, validation messages) in `<user_data>…</user_data>` delimiters
  so chat consumers can keep prompt-injection defence-in-depth. Two new
  utilities are exported: `wrapUserData(s)` and `redactNestedStrings(obj)`.
- Updated dependencies [0ffb1d3]
- Updated dependencies [ca237ef]
- Updated dependencies [6422b9b]
- Updated dependencies [78b651a]
- Updated dependencies [6422b9b]
- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/cli@4.0.0
  - @walkeros/core@4.0.0

## 3.4.2

### Patch Changes

- 2d25eda: Replace `api` mega-tool with four focused management tools: `auth`
  (device code login), `project_manage`, `flow_manage`, and `deploy_manage`.
  Enforce strict CLI/MCP separation of concern — MCP no longer reads config
  files or checks env vars directly. All tools are always registered regardless
  of auth state.

  CLI exports new functions: `requestDeviceCode`, `pollForToken`,
  `setDefaultProject`, `getDefaultProject`, `listAllFlows`,
  `setFeedbackPreference`, `getFeedbackPreference`, `resolveToken`,
  `deleteConfig`.

  Preview CRUD (`preview_list`, `preview_get`, `preview_create`,
  `preview_delete`) is now part of `flow_manage` — previews are a flow-scoped
  concern and belong alongside the flow lifecycle actions rather than in a
  separate tool.

- Updated dependencies [2d25eda]
- Updated dependencies [cb4c069]
  - @walkeros/cli@3.4.2
  - @walkeros/core@3.4.2

## 3.4.1

### Patch Changes

- caea905: Add `preview.list`, `preview.get`, `preview.create`, and
  `preview.delete` actions to the `api` tool. When `siteUrl` is provided to
  `preview.create`, the response includes a ready-to-open `activationUrl` and
  `deactivationUrl`.
- 12adf24: Step examples can now carry a `title`, `description`, and `public`
  flag. Non-public examples stay hidden from the docs and AI tools so first-time
  visitors see only the canonical ones.
- Updated dependencies [caea905]
- Updated dependencies [caea905]
- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
  - @walkeros/cli@3.4.1
  - @walkeros/core@3.4.1

## 3.4.0

### Minor Changes

- 9f97bdd: Clients now send `User-Agent`, `X-WalkerOS-Client`, and
  `X-WalkerOS-Client-Version` on every request to the walkerOS app. When the app
  returns `426 Upgrade Required`, the CLI prints the required version + upgrade
  instruction and exits with code 2; the MCP surfaces the same info in tool
  errors. Set `WALKEROS_CLIENT_TYPE=runner` to have the CLI binary identify as a
  long-lived runner instead of an interactive CLI (used by the runtime image so
  runners are distinguishable from interactive sessions).

### Patch Changes

- Updated dependencies [1a0f8f2]
- Updated dependencies [9f97bdd]
- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/cli@3.4.0
  - @walkeros/core@3.4.0

## 3.3.1

### Patch Changes

- Updated dependencies [62f6a38]
  - @walkeros/cli@3.3.1
  - @walkeros/core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [ae02457]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/cli@3.3.0
  - @walkeros/core@3.3.0

## 3.2.0

### Minor Changes

- 884527d: Unify simulation for sources, destinations, and transformers through
  the push command.
  - All step types simulate via `push` with auto-env loading and call tracking
  - Add `--simulate transformer.X` to invoke a transformer directly with an
    event
  - Before chains run as mandatory preparation; next chains are skipped
  - Source simulation captures at the collector.push boundary, preserving the
    full before chain
  - Hooks (prePush/postDestinationPush) capture events instead of manual
    overrides
  - Timer interception flushes setTimeout/setInterval deterministically for
    async patterns (debounced batches, detached Promise chains)
  - MCP migrated to the push-based simulation pipeline
  - Legacy simulate code removed

### Patch Changes

- b826b5f: Improve flow_simulate tool description, warnings, and prompts to
  explain require, consent, mapping, and policy behavior. Agents using the MCP
  now get actionable guidance when destinations are pending or events are
  silently skipped.
- Updated dependencies [eb865e1]
- Updated dependencies [f55fc1d]
- Updated dependencies [bbbeba1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [7d1a268]
- Updated dependencies [616b9b2]
- Updated dependencies [bf2dc5b]
- Updated dependencies [91159be]
- Updated dependencies [da0b640]
- Updated dependencies [2cc1b54]
- Updated dependencies [a0b019f]
- Updated dependencies [431be04]
- Updated dependencies [884527d]
  - @walkeros/core@3.2.0
  - @walkeros/cli@3.2.0

## 3.1.1

### Patch Changes

- 031be8b: Remove summary parameter from mcpResult — tool results now always
  return full JSON data in content text instead of a lossy one-liner
- Updated dependencies [a5d98d2]
  - @walkeros/cli@3.1.1
  - @walkeros/core@3.1.1

## 3.1.0

### Minor Changes

- dfc6738: MCP api tool: replace overloaded `id` param with explicit `projectId`
  and `flowId`. CLI functions now throw structured ApiError with code and
  details from the API response. mcpError forwards structured error data to MCP
  clients.
- 966342b: Add mergeConfigSchema to core and integrate into MCP package_get
  tool.

  package_get now returns schemas.config — a merged JSON Schema combining base
  config fields (require, consent, logger, mapping, etc.) from core with the
  package's typed settings schema. Runtime-only fields (env, onError, onLog) are
  excluded.

- 5799262: Fix MCP issues from user feedback: add 'entry' to validate output
  type, include version in feedback payload, require Node >=20, support inline
  JSON in loadJsonConfig for sandboxed environments
- bee8ba7: Replace hardcoded package registry with live npm search. Package
  catalog is now fetched dynamically from npm and enriched with walkerOS.json
  metadata from CDN.

  Change platform type from string to array. Packages declare platform as
  ["web"], ["server"], or ["web", "server"]. Empty array means
  platform-agnostic. The normalizePlatform utility handles backwards
  compatibility with the old string format from already-published packages.

  Remove outputSchema from package_get to prevent SDK validation crashes on
  unexpected field values.

- df990d4: Unified source simulation input. All source simulation uses
  SourceInput { content, trigger?, env? } — one format for CLI, MCP, and tests.
  Removes legacy runSourceLegacy and deprecated SimulateSource fields. CLI gains
  --step flag. MCP flow_simulate drops example parameter (use flow_examples to
  discover, then provide event). flow_examples now returns trigger metadata.
  StepExample Zod schema aligned with TypeScript type.

### Patch Changes

- Updated dependencies [fc67b30]
- Updated dependencies [357aa95]
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [5799262]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [8e687a6]
- Updated dependencies [df990d4]
  - @walkeros/cli@3.1.0
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- afd4d07: Add feedback command and MCP tool for sending user feedback
- 78ed476: Improve MCP guidance: source-output-first mapping, ingest awareness,
  concise warnings, source-agnostic tools
- Updated dependencies [afd4d07]
  - @walkeros/cli@3.0.2
  - @walkeros/core@3.0.2

## 3.0.1

### Patch Changes

- 86c81d1: Add default export to server-transformer-fingerprint and exports
  metadata to multi-service packages for bundler named import support
- Updated dependencies [86c81d1]
  - @walkeros/cli@3.0.1
  - @walkeros/core@3.0.1

## 3.0.0

### Minor Changes

- 1fe337a: Add hints field to walkerOS.json for lightweight AI-consumable
  package context.

  Packages can now export a `hints` record from `src/dev.ts` containing short
  actionable tips with optional code snippets. Hints are serialized into
  `walkerOS.json` by buildDev() and surfaced via the MCP `package_get` tool.

  Pilot: BigQuery destination includes hints for authentication, table setup,
  and querying.

- c73ef22: Redesign MCP flow server into unified orchestrator
  - Rename tools to flow\_\* prefix (flow_validate, flow_bundle, flow_simulate,
    flow_push, flow_examples)
  - Replace flow_init with flow_load (load existing or create new flows)
  - Convert flow_schema tool to walkeros://reference/flow-schema resource
  - Add 8 reference resources (event-model, mapping, consent, variables,
    contract, api, packages, flow-schema)
  - Merge 17 API tools into single `api` tool with action enum (conditional on
    WALKEROS_TOKEN)
  - Add 4 MCP prompts (add-step, setup-mapping, manage-contract,
    use-definitions)
  - Summarize simulate output with per-destination results
  - Standardize responses with mcpResult/mcpError and \_hints for next-step
    guidance

- 5cb84c1: Replace hand-written MCP resources with auto-generated JSON Schemas
  from @walkeros/core. Add walkerOS.json to 5 transformer packages. Variables
  resource remains hand-maintained (runtime interpolation patterns).

### Patch Changes

- 0e5eede: BREAKING: Flow configs now require `"version": 3`. Versions 1 and 2
  are no longer accepted. To migrate, change `"version": 1` or `"version": 2` to
  `"version": 3` in your walkeros.config.json.
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [ddd6a21]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [67dd7c8]
- Updated dependencies [d5af3cf]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [55ce33e]
- Updated dependencies [b6c8fa8]
  - @walkeros/cli@3.0.0
  - @walkeros/core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/cli@2.1.1

## 2.1.0

### Minor Changes

- cb2da05: Add data contracts for centralized event validation and documentation

### Patch Changes

- 3bc32de: Surface mapping field in examples_list and ExampleLookupResult
- Updated dependencies [fed78f0]
- Updated dependencies [7b7e37b]
- Updated dependencies [7fc4cee]
- Updated dependencies [7fc4cee]
- Updated dependencies [cb2da05]
- Updated dependencies [fed78f0]
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [5145662]
- Updated dependencies [39780b0]
- Updated dependencies [02a7958]
- Updated dependencies [3bc32de]
- Updated dependencies [dd53425]
- Updated dependencies [66aaf2d]
- Updated dependencies [5145662]
- Updated dependencies [7fc4cee]
- Updated dependencies [1876bb9]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [026c412]
- Updated dependencies [7d38d9d]
  - @walkeros/cli@2.1.0
  - @walkeros/core@2.1.0
