# @walkeros/core

## 3.0.1

## 3.0.0

### Major Changes

- 0e5eede: BREAKING: Flow configs now require `"version": 3`. Versions 1 and 2
  are no longer accepted. To migrate, change `"version": 1` or `"version": 2` to
  `"version": 3` in your walkeros.config.json.
- d11f574: Rename Flow.Setup to Flow.Config and Flow.Config to Flow.Settings for
  consistent Config/Settings naming convention at every level. Breaking change:
  all type names, function names, schema names, and API URL paths (/configs →
  /settings) updated.
- 23f218a: Replace flat/v2 contract format with named contracts supporting
  extends inheritance.

  BREAKING CHANGES:
  - `contract` is now a map of named contract entries (e.g.,
    `{ "default": { ... }, "web": { ... } }`)
  - `version` field inside contracts removed
  - `$tagging` renamed to `tagging`
  - Legacy flat contract format removed
  - `$globals`, `$context`, `$custom`, `$user`, `$consent` references removed
  - Settings-level `contract` field removed (use named contracts at config
    level)
  - Auto-injection of `$tagging` into `collector.tagging` removed (use
    `$contract.name.tagging` explicitly)
  - Validator `contract` setting renamed to `events` (receives raw schemas, not
    `{ schema: ... }` wrappers)

  NEW FEATURES:
  - Named contracts with `extends` for inheritance (additive merge)
  - Generalized dot-path resolution: `$def.name.nested.path`,
    `$contract.name.section`
  - `$contract` as first-class reference type with path access
  - `$def` inside contracts supported via two-pass resolution
  - `$def` aliasing for reducing repetition: `{ "c": "$contract.web" }` then
    `$def.c.events`

### Minor Changes

- 6ae0ee3: Add v2 structured contract format with globals, context, custom,
  user, and consent sections.

  Contracts can now describe cross-event properties (globals, consent, etc.)
  alongside entity-action event schemas. Top-level sections are JSON Schemas
  that merge additively into per-event validation.

  Breaking: None. Legacy flat contracts continue working unchanged. v2 is opt-in
  via `version: 2` field.

- 1fe337a: Add hints field to walkerOS.json for lightweight AI-consumable
  package context.

  Packages can now export a `hints` record from `src/dev.ts` containing short
  actionable tips with optional code snippets. Hints are serialized into
  `walkerOS.json` by buildDev() and surfaced via the MCP `package_get` tool.

  Pilot: BigQuery destination includes hints for authentication, table setup,
  and querying.

- c83d909: Add Store types as fourth modular component type. Stores provide
  pluggable key-value storage (get/set/delete/destroy) with sync and async
  support for browser and server backends.
- b6c8fa8: Add stores as a first-class component type in Flow.Config. Stores get
  their own `stores` section in flow settings, a `collector.stores` registry,
  and `$store:storeId` env wiring in the bundler. Includes `storeMemoryInit` for
  Flow.Config compatibility and type widening in cache/file transformers.

### Patch Changes

- 2b259b6: Fix deterministic package version resolution in bundler.
  - Two-phase resolve-then-install prevents version overwrites
  - peerDependencies resolved at lowest priority (not equal to deps)
  - Per-build temp directories prevent cross-build interference
  - Optional peerDeps (peerDependenciesMeta) correctly skipped
  - Prerelease versions handled with includePrerelease flag
  - Package names validated against npm naming rules

- 2614014: Fix: `consent: {}` on destination config now auto-grants instead of
  blocking all events forever
- 37299a9: Extract match logic (compileMatcher, MatchExpression, MatchCondition,
  MatchOperator, CompiledMatcher) from router to core as shared utility. Router
  now imports from core — no public API changes.
- 499e27a: Fix getByPath breaking on falsy intermediate values (0, false, "")
- d11f574: Fix $var/$def/$env resolution in transformer configs and env fields

  Previously, `resolvePatterns` was not called on transformer configs or any
  component's `env` field. This meant `$var.name`, `$def.name`, and `$env.NAME`
  references in those positions were passed through as literal strings. Now all
  component types (sources, destinations, transformers, stores) have both
  `config` and `env` resolved consistently.

- 5cb84c1: Replace hand-written MCP resources with auto-generated JSON Schemas
  from @walkeros/core. Add walkerOS.json to 5 transformer packages. Variables
  resource remains hand-maintained (runtime interpolation patterns).
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.

## 2.1.1

### Patch Changes

- fab477d: Replace union transformer return type with unified
  `Transformer.Result` object. Transformers now return `{ event }` instead of
  naked events, and can optionally include `respond` (for wrapping) or `next`
  (for branching). The `BranchResult` type and `__branch` discriminant are
  removed.

## 2.1.0

### Minor Changes

- 7fc4cee: Add default values and improved descriptions to flow schemas for
  better IDE IntelliSense
- cb2da05: Add data contracts for centralized event validation and documentation
- 2bbe8c8: Add destroy lifecycle method to all step types (sources,
  destinations, transformers) and shutdown command to collector
- 3eb6416: Add unified `env.respond` capability. Any step (transformer,
  destination) can now customize HTTP responses via
  `env.respond({ body, status?, headers? })`. Sources configure the response
  handler — Express source uses createRespond for idempotent first-call-wins
  semantics. CLI serve mode removed (superseded by response-capable flows).
- 02a7958: Add WARN log level (ERROR=0, WARN=1, INFO=2, DEBUG=3). Logger
  instances expose `warn()` method routed to `console.warn` and `json()` method
  for structured output. Config accepts optional `jsonHandler`. MockLogger
  includes both as jest mocks. CLI logger unified with core logger via
  `createCLILogger()` factory.
- 026c412: Unified simulation API: single simulate() function replaces
  simulateSource/simulateDestination/simulateTransformer/simulateFlow. Built-in
  call tracking for destinations via wrapEnv. No bundling required for
  simulation.
- 7d38d9d: Add `validateFlowSetup` for portable Flow.Setup validation with
  line/column positions and IntelliSense context extraction.

### Patch Changes

- 7fc4cee: Add contract as optional property to Flow.Setup schema
- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export
- 97df0b2: Step examples: add mapping field to StepExample type, rewrite Meta
  Pixel examples with functional tests

## 2.0.1

### Patch Changes

- e34c11e: Align all packages to unified v2 with consistent dependency structure

## 1.4.0

### Minor Changes

- 7b2d750: Add walkerOS.json package convention for CDN-based schema discovery

## 1.3.0

### Minor Changes

- a4cc1ea: Add collector.status for per-source and per-destination delivery
  tracking

## 1.2.2

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

## 1.2.1

### Patch Changes

- 6256c12: Add inline code support for sources, transformers, and destinations
  - Add `InlineCodeSchema` with `push`, `type`, and `init` fields for embedding
    JavaScript in flow configs
  - Make `package` field optional in reference schemas (either `package` or
    `code` required at runtime)
  - Update `flow-complete.json` example with inline code demonstrations
    including enricher transformer, debug destination, and conditional mappings

## 1.2.0

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

## 1.1.0

### Minor Changes

- 20eca6e: Breaking change: Unified dynamic pattern syntax in Flow
  configuration, sorry!

  **New syntax:**
  - `$def.name` - Reference definitions (replaces
    `{ "$ref": "#/definitions/name" }`)
  - `$var.name` - Reference variables (replaces `$variables.name`)
  - `$env.NAME` or `$env.NAME:default` - Reference environment variables

  **Migration:**

  | Old Syntax                              | New Syntax                             |
  | --------------------------------------- | -------------------------------------- |
  | `{ "$ref": "#/definitions/itemsLoop" }` | `$def.itemsLoop`                       |
  | `$variables.currency`                   | `$var.currency`                        |
  | `${GA4_ID}` or `${GA4_ID:default}`      | `$env.GA4_ID` or `$env.GA4_ID:default` |

  **Note:** Only `$env` supports defaults (`:default`) because environment
  variables are external and unpredictable. Variables (`$var`) are explicitly
  defined in config, so missing ones indicate a configuration error and will
  throw.

  **Example:**

  ```json
  {
    "variables": { "currency": "EUR" },
    "definitions": {
      "itemsLoop": { "loop": ["nested", { "map": { "item_id": "data.id" } }] }
    },
    "destinations": {
      "ga4": {
        "config": {
          "measurementId": "$env.GA4_ID:G-DEMO123",
          "currency": "$var.currency",
          "items": "$def.itemsLoop"
        }
      }
    }
  }
  ```

### Patch Changes

- b65b773: Queue on() events until destination init completes

  Destinations now receive `on('consent')` and other lifecycle events only after
  `init()` has completed. Previously, `on()` was called before `init()`,
  requiring workarounds like gtag's `initializeGtag()` call inside its `on()`
  handler.

  Also renamed queue properties for clarity:
  - `destination.queue` → `destination.queuePush`
  - `destination.onQueue` → `destination.queueOn`

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.
