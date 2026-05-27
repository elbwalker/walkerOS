# @walkeros/collector

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2

## 4.1.1

### Patch Changes

- 0b7f494: The collector exposes `observers: Set<ObserverFn>` so any subscriber
  can watch every step of the pipeline. Each source, transformer, destination,
  and store call emits a `FlowState` record with timings, mapping match, consent
  state, and skip reasons. `createTelemetryObserver` from `@walkeros/core`
  batches emissions to an HTTP endpoint, and the CLI runtime picks up the
  `traceUntil` flag from its heartbeat so trace mode toggles take effect without
  a redeploy.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/core@4.1.1

## 4.1.0

### Minor Changes

- e155ff8: Collector and destination buffers are now size-bounded with FIFO
  drop-oldest eviction. Defaults: collector `queueMax: 1000`, destination
  `queueMax: 1000`, destination `dlqMax: 100`. Set either knob to override per
  scope. Drop counts surface in `collector.status.dropped` and
  `collector.status.destinations[id]`.
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

- adeebea: Route grammar: rename `case` to `one` (first-match dispatch) and add
  `many` (all-match parallel fan-out, pre-collector only). `many` terminates the
  main chain and is rejected at post-collector positions (`destination.before`,
  `destination.next`); use multiple destinations for post-collector fan-out.
  `RouteCaseConfig` is renamed to `RouteOneConfig`; no aliases.
- 13aaeaa: `Source.Context` no longer exposes `setIngest` or `setRespond`.
  Server sources handling concurrent inbound requests must call
  `context.withScope(rawScope, respond, body)` to bind per-request ingest and
  respond. Browser and other single-scope sources keep working without changes.
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

- fd6076e: Walker commands `destination`, `hook`, and `on` now take a single
  Init object: `elb('walker destination', { code, config })`,
  `elb('walker hook', { name, fn })`, `elb('walker on', { type, rules })`. The
  previous positional forms and the `{ push }` shorthand are removed; the
  `options` argument is gone from `collector.command`, `addDestination`, and
  `commonHandleCommand`.

### Patch Changes

- e155ff8: Cache reads through `checkCache` are now correct against async stores
  (filesystem, Redis, any store with an async `get`). Previously a custom async
  store could silently miss the cache.

  `checkCache` returns a Promise. External callers must add `await`.

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

- e800974: `Status.dropped` is now keyed by stepId, so operators can see at a
  glance which step dropped events. Read with
  `status.dropped["collector"]?.queue` or
  `status.dropped["destination.<id>"]?.queue` / `.dlq`, or build the key with
  the new `stepId()` helper exported from `@walkeros/core`. Breaking change: the
  previous flat shape (`status.dropped.queue` / `.queuePush` / `.dlq`) and the
  per-destination `dropped` field on `DestinationStatus` are removed.
- 6cdc362: Add `@walkeros/transformer-ga4`: GA4 Measurement Protocol v2 decoder
  transformer with default mappings for 33 standard events. Server-side use via
  `source-express` in the `before` chain.

  Also: fix collector to preserve fan-out in `source.before` chains. Previously,
  when a before-transformer returned an array of events, only the first
  survived. This enables vendor-protocol decoders (GA4, Segment, Snowplow, etc.)
  to fan a batched request into N walkerOS events.

- e800974: Internal pipeline failures in mapping, source startup, transformer
  init, and destination init now log via the scoped logger and increment
  `collector.status.failed`. Previously silent. User-supplied callbacks (mapping
  `condition`/`fn`/`validate`, `on` subscriptions) log on throw but do not
  affect `status.failed`. A source whose `init()` throws now stays
  `config.init === false` instead of being marked initialized.
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

## 4.0.2

### Patch Changes

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2

## 4.0.1

### Patch Changes

- cb265eb: Surface destination init errors in logs at ERROR level. Previously,
  two layers swallowed errors silently: the gcp destination's init catch only
  logged for `isNotFound` errors and re-threw everything else without logging;
  the collector wrapped `destinationInit` with `tryCatchAsync` (no `onError`),
  which silently returned `undefined` on a thrown error and treated the
  destination as not-initialized. Combined effect: a real init failure (e.g.,
  the recent `streamType` regression in BigQuery Storage Write API call) showed
  only `[gcp-bigquery] init` in DEBUG logs and nothing else, regardless of log
  level.

  Now: gcp's init catch logs every error at ERROR before re-throwing (with
  consistent `error:` context key), AND the collector logs at ERROR via
  `logger.scope(destType).error('Destination init threw', { error })` if init
  throws or rejects. Failures are never silent. Mocks updated to enforce the new
  shapes; tests cover both sync-throw and async-rejection variants.

- 1524275: Source lifecycle redesign: factory + eager `init` + collector-gated
  `on()`

  Source factories must now be side-effect-free. The collector calls
  `Instance.init()` on each source eagerly after all factories register.
  `require` no longer gates code execution. It gates `on(type)` delivery (events
  queue in `Instance.queueOn` until the source is started, then replay).
  `collector.pending.sources` has been removed; per-source state lives on
  `Source.Instance` (`queueOn`) and `Source.Config` (`init`, `require`).

  Migration: any source factory with side effects (queue draining, walker
  command emission, listener attachment) should move those into the returned
  Instance's optional `init` method. Tests asserting on
  `collector.pending.sources` should read `collector.sources[id]` and inspect
  `config.init` / `config.require` instead.

  Fixes the elbLayer queue replay clobbering fresh consent/user state,
  late-activated sources missing `walker run`, and inter-source require chains
  racing when a non-required source's init fired a state-mutating walker command
  before later require-gated sources had been registered.

- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/core@4.0.1

## 4.0.0

### Major Changes

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

- 1ef33d9: **BREAKING:** Unified callback signatures across mapping and on.\*
  subscriptions.

  Every callback in walkerOS now reads `(data, context) => result`. Sources,
  transformers, destinations, and stores already conformed; mapping and on.\*
  join the family in v4.1.

  ### Mapping callbacks

  `fn`, `condition`, and `validate` now share a single shape:

  `(value, context: Mapping.Context) => result`

  `Mapping.Options` is removed. Replaced by `Mapping.Context`:

  ```ts
  interface Context {
    event: WalkerOS.DeepPartialEvent;
    mapping: Value | Rule;
    collector: Collector.Instance; // required
    logger: Logger.Instance; // required
    consent?: WalkerOS.Consent; // resolved consent
  }
  ```

  Rule-level `condition` is now `(event, context) => boolean`.
  `Mapping.Options.props` is removed (no production callers).

  #### Mapping upgrade

  ```ts
  // before
  const fn: Mapping.Fn = (value, mapping, options) => /* … */;
  const cond: Mapping.Condition = (value, mapping, collector) => /* … */;
  const val: Mapping.Validate = (value) => /* … */;

  // after
  const fn: Mapping.Fn = (value, context) => /* … */;
  const cond: Mapping.Condition = (value, context) => /* … */;
  const val: Mapping.Validate = (value, context) => /* … */;
  ```

  In `$code:` strings (flow.json):

  ```json
  // before
  "fn": "$code:(value, mapping, options) => …"
  "condition": "$code:(value, mapping, collector) => …"

  // after
  "fn": "$code:(value, context) => …"
  "condition": "$code:(value, context) => …"
  ```

  `context.mapping` replaces the second positional arg; `context.collector`,
  `context.logger`, and `context.consent` are all available.

  One-arg callbacks like `(value) => value.toUpperCase()` continue to work
  unchanged.

  ### On.\* subscription callbacks

  `walker.on('consent', …)`, `walker.on('ready', …)`, etc. now receive
  `(data, context: On.Context) => void | Promise<void>`. The legacy `Context`
  interface, `*Config` aliases, and `Options` discriminated union are removed.

  ```ts
  interface Context {
    collector: Collector.Instance; // required
    logger: Logger.Instance; // required
  }

  type Fn<TData = unknown> = (
    data: TData,
    context: Context,
  ) => void | Promise<void>;

  type ConsentFn = Fn<WalkerOS.Consent>;
  type SessionFn = Fn<Collector.SessionData | undefined>;
  type UserFn = Fn<WalkerOS.User>;
  type ReadyFn = Fn<void>;
  type RunFn = Fn<void>;
  type GenericFn = Fn<unknown>;
  ```

  The new `On.Subscription` alias is the registerable union for
  `walker.on(action, X)`.

  #### On.\* upgrade

  ```ts
  // before
  walker.on('consent', { marketing: (collector, consent) => /* … */ });
  walker.on('ready', (collector) => /* … */);
  walker.on('session', (collector, session) => /* … */);

  // after
  walker.on('consent', { marketing: (consent, ctx) => /* … */ });
  walker.on('ready', (_, ctx) => /* … */);
  walker.on('session', (session, ctx) => /* … */);
  ```

  `ctx.collector` replaces the positional first arg; `ctx.logger` is also
  available.

  ### Why both at once

  Both refactors follow the same `(data, context)` pattern. Shipping them in one
  release means consumers do one search-and-replace pass instead of two, and the
  codebase reaches full callback-signature consistency in v4.1.

### Minor Changes

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

- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/core@3.4.2

## 3.4.1

### Patch Changes

- 75aa26b: `useHooks` now isolates hook failures. A pre-hook that throws no
  longer crashes the pipeline — the wrapped function is called directly and a
  warning is logged. A post-hook that throws leaves the original result in
  place. Added optional 4th `logger` parameter so warnings route through the
  walkerOS Logger (falls back to `console.warn` when no logger is provided). All
  collector call sites now pass `collector.logger`.
- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
  - @walkeros/core@3.4.1

## 3.4.0

### Patch Changes

- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0

## 3.3.1

### Patch Changes

- b10144a: Collector auto-generated destination keys now use lowercase letters
  only (a-z, length 5) instead of base-36 (0-9a-z, length 4). `getId` gains an
  optional charset parameter; default behavior is unchanged so session IDs and
  other existing callers stay bit-for-bit identical.
- 206185a: Fix infinite recursion when registering `on('consent', ...)`
  handlers. The collector's `on()` helper previously re-broadcast to all source
  `on` handlers, causing self-re-registering consent handlers to recurse
  unbounded and crash the tab. `on()` now fires only the newly-registered
  callback against current state.
- 50e5d09: Fix release pipeline to embed the correct `__VERSION__` in published
  packages.
- 32ff626: Fix race in source cache MISS wrapper: `applyUpdate` promise was
  fire-and-forget, so a source fallback (e.g. express GIF default) could win
  `createRespond`'s first-call-wins race on the first request. `wrappedPush` now
  awaits the pending update before returning.
  - @walkeros/core@3.3.1

## 3.3.0

### Minor Changes

- 08c365a: Add `include` as a first-class field on `Destination.Config`
  (destination-level) and `Mapping.Rule` (per-event override). The collector
  resolves `include` in `processEventMapping` before calling `push()`,
  flattening specified event sections into prefixed key-value pairs (e.g.
  `data_price: 420`) and merging them as the bottom layer of `context.data`.

  Rule-level `include` replaces config-level (not additive). Merge priority:
  include (bottom) → config.data → rule.data (top, wins on conflict). The
  `context` section correctly extracts `[0]` from OrderedProperties tuples.

  New export: `flattenIncludeSections(event, sections)` from `@walkeros/core`.

- 08c365a: Add `skip?: boolean` to `Mapping.Rule` as a universal sibling of
  `ignore`. Destinations can now honor a rule-level `skip` to process
  `settings.*` side effects (identify, revenue, group, etc.) while omitting
  their default forwarding call (`track()`, `capture()`, `event()`). Replaces
  destination-specific `settings.skipTrack` / `settings.skipEvent` toggles.

  `processEventMapping()` now returns an explicit `skip: boolean` field
  alongside `ignore`. The collector does not short-circuit on `skip` — it still
  calls `destination.push()` so the destination can run its side effects. The
  destination implementation reads `context.rule?.skip` and gates its default
  forwarding call on `!skip`.

  `ignore: true` still wins when both flags are set on the same rule.

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0

## 3.2.0

### Minor Changes

- eb865e1: Add chainPath to ingest metadata and support path-specific mocks via
  --mock destination.ga4.before.redact='...'
- c0a53f9: Flow graph architecture: symmetric before/next hooks, mutable Ingest,
  per-destination isolation.
  - Add symmetric `before`/`next` to all step types (sources, transformers,
    destinations)
  - Add `Ingest` interface with mutable `_meta` tracking (hops, path)
  - Parameterize `Transformer.Fn<T, E>` and `Result<E>` on event type
  - Support `Result[]` return from transformers for fan-out
  - Remove `Object.freeze(ingest)` — ingest is fully mutable
  - Upgrade `setIngest` to create typed `Ingest` with `_meta`
  - Clone ingest per destination to prevent cross-contamination
  - Add `createMockContext` test utility for context construction

- f007c9f: Wire initConfig.hooks into collector instance. Simulation uses
  prePush/postDestinationPush hooks for event capture. Hooks are wired by
  startFlow before events fire.
- bf2dc5b: Add conditional routing and native cache as built-in config
  properties on sources, transformers, and destinations.

  **Routing:** NextRule[] in next/before properties enables conditional step
  chaining, replacing @walkeros/transformer-router.

  **Cache:**
  - Cache rules use the same match syntax as routing (MatchExpression)
  - Source cache: full pipeline caching with respond interception
  - Transformer cache: step-level memoization, chain continues
  - Destination cache: event deduplication
  - Update rules modify cached results on read via getMappingValue
  - Default per-collector memory store with namespaced keys

  compileMatcher upgraded to use getByPath for scoped dot-paths (ingest.method,
  event.name). Removed @walkeros/server-transformer-cache (replaced by native
  cache).

- da0b640: Add include/exclude destination filter to collector.push PushOptions.
  Sources can now control which destinations receive their events. Destination
  simulation uses the full collector pipeline with include filter, giving
  production-identical event enrichment, consent, and mapping.
- a5d25bc: Transformer respond wrappers now propagate through the pipeline
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

- 8cdc0bb: Generalize queue flush: refresh user/globals/consent on queued events
  and flush after any state mutation command
- 9a99298: Add useHooks wrapping to store get/set/delete operations
- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
  - @walkeros/core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1

## 3.1.0

### Minor Changes

- df990d4: Unified source simulation input. All source simulation uses
  SourceInput { content, trigger?, env? } — one format for CLI, MCP, and tests.
  Removes legacy runSourceLegacy and deprecated SimulateSource fields. CLI gains
  --step flag. MCP flow_simulate drops example parameter (use flow_examples to
  discover, then provide event). flow_examples now returns trigger metadata.
  StepExample Zod schema aligned with TypeScript type.

### Patch Changes

- a9149e4: Add createTrigger to browser source examples following unified
  Trigger.CreateFn interface. Step examples migrated to HTML content format with
  trigger metadata. Collector simulate.ts updated with dual-path support for
  createTrigger and legacy triggers.
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1

## 3.0.0

### Minor Changes

- b6c8fa8: Add stores as a first-class component type in Flow.Config. Stores get
  their own `stores` section in flow settings, a `collector.stores` registry,
  and `$store:storeId` env wiring in the bundler. Includes `storeMemoryInit` for
  Flow.Config compatibility and type widening in cache/file transformers.

### Patch Changes

- 499e27a: Fix double-queuing of denied events when all events lack consent
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- a2aa491: Fix store reference resolution: env values from `$store:` now
  correctly resolve to initialized Store.Instance during transformer/destination
  push. Preserve config.env across transformer init lifecycle.
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

## 2.1.1

### Patch Changes

- fab477d: Replace union transformer return type with unified
  `Transformer.Result` object. Transformers now return `{ event }` instead of
  naked events, and can optionally include `respond` (for wrapping) or `next`
  (for branching). The `BranchResult` type and `__branch` discriminant are
  removed.
- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1

## 2.1.0

### Minor Changes

- 2bbe8c8: Add destroy lifecycle method to all step types (sources,
  destinations, transformers) and shutdown command to collector
- 3eb6416: Add unified `env.respond` capability. Any step (transformer,
  destination) can now customize HTTP responses via
  `env.respond({ body, status?, headers? })`. Sources configure the response
  handler — Express source uses createRespond for idempotent first-call-wins
  semantics. CLI serve mode removed (superseded by response-capable flows).
- 026c412: Unified simulation API: single simulate() function replaces
  simulateSource/simulateDestination/simulateTransformer/simulateFlow. Built-in
  call tracking for destinations via wrapEnv. No bundling required for
  simulation.

### Patch Changes

- 02a7958: Add WARN log level (ERROR=0, WARN=1, INFO=2, DEBUG=3). Logger
  instances expose `warn()` method routed to `console.warn` and `json()` method
  for structured output. Config accepts optional `jsonHandler`. MockLogger
  includes both as jest mocks. CLI logger unified with core logger via
  `createCLILogger()` factory.
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

## 2.0.1

## 2.0.0

### Minor Changes

- 32bfc92: Add transformer chain branching support

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0

## 1.2.0

### Minor Changes

- a4cc1ea: Add collector.status for per-source and per-destination delivery
  tracking

### Patch Changes

- 9599e60: Fix silent event loss when destination processes queued events with
  mixed consent states
- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0

## 1.1.3

### Patch Changes

- e9c9faa: Fix transformer chain next property not being preserved during
  initialization

  The `initTransformers` function was not calling `extractChainProperty` to
  merge the definition-level `next` value into the transformer's config. This
  caused `walkChain` to only resolve the first transformer in any chain,
  breaking `destination.before` chains like
  `filter -> fingerprint -> geo -> sessionEnricher`.

## 1.1.2

### Patch Changes

- 7ad6cfb: Fix transformer chains computed on-demand instead of pre-computed

  Transformer chains configured via `destination.before` now work correctly.
  Previously, chains were pre-computed at initialization but the resolution
  function was never called, causing `before` configuration to be silently
  ignored.

  **What changed:**
  - Chains now compute at push time from `destination.config.before`
  - Removed unused `collector.transformerChain` state
  - Removed dead `resolveTransformerGraph()` function
  - Dynamic destinations now support `before` property

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2

## 1.1.1

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1

## 1.1.0

### Minor Changes

- f39d9fb: Add array support for transformer chain configuration

  Enables explicit control over transformer chain order by accepting arrays for
  `next` and `before` properties, bypassing automatic chain resolution.

  **Array chain behavior:**

  | Syntax                           | Behavior                                               |
  | -------------------------------- | ------------------------------------------------------ |
  | `"next": "validate"`             | Walks chain via each transformer's `next` property     |
  | `"next": ["validate", "enrich"]` | Uses exact order specified, ignores transformer `next` |

  **Example:**

  ```json
  {
    "sources": {
      "http": {
        "package": "@walkeros/server-source-express",
        "next": ["validate", "enrich", "redact"]
      }
    },
    "destinations": {
      "analytics": {
        "package": "@walkeros/server-destination-gcp",
        "before": ["format", "anonymize"]
      }
    }
  }
  ```

  When walking a chain encounters an array `next`, it appends all items and
  stops (does not recursively resolve those transformers' `next` properties).

- 888bbdf: Add inline code syntax for sources, transformers, and destinations

  Enables defining custom logic directly in flow.json using `code` objects
  instead of requiring external packages. This is ideal for simple one-liner
  transformations.

  **Example:**

  ```json
  {
    "transformers": {
      "enrich": {
        "code": {
          "push": "$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })"
        },
        "config": {}
      }
    }
  }
  ```

  **Code object properties:**
  - `push` - The push function with `$code:` prefix (required)
  - `type` - Optional instance type identifier
  - `init` - Optional init function with `$code:` prefix

  **Rules:**
  - Use `package` OR `code`, never both (CLI validates this)
  - `config` stays separate from `code`
  - `$code:` prefix outputs raw JavaScript at bundle time

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0

## 1.0.1

### Patch Changes

- b65b773: Queue on() events until destination init completes

  Destinations now receive `on('consent')` and other lifecycle events only after
  `init()` has completed. Previously, `on()` was called before `init()`,
  requiring workarounds like gtag's `initializeGtag()` call inside its `on()`
  handler.

  Also renamed queue properties for clarity:
  - `destination.queue` → `destination.queuePush`
  - `destination.onQueue` → `destination.queueOn`

- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0
