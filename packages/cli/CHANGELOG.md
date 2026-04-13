# @walkeros/cli

## 3.3.0

### Minor Changes

- 2849acb: **BREAKING CHANGE:** The `packages` block has moved from
  `flow.<name>.packages` to `flow.<name>.bundle.packages`. Flow files using the
  old shape fail fast with a migration error pointing to the new location.

  Also adds `flow.<name>.bundle.overrides` — a `Record<string, string>` for
  pinning transitive dependency versions, matching npm's `overrides` semantics.
  Use this to resolve version conflicts when a transitive dependency's declared
  range conflicts with another required version in the same tree (the original
  motivating case: `@amplitude/engagement-browser` pins
  `@amplitude/analytics-types@^1.0.0` while `@amplitude/analytics-browser`
  transitively requires `analytics-types@2.11.1` exact — previously an
  unresolvable bundler conflict).

  **Migration:** move the existing `packages` block one level deeper into a new
  `bundle` wrapper.

  ```diff
    {
      "version": 3,
      "flows": {
        "default": {
          "web": {},
  -       "packages": {
  -         "@walkeros/collector": {}
  -       },
  +       "bundle": {
  +         "packages": {
  +           "@walkeros/collector": {}
  +         }
  +       },
          "sources": { },
          "destinations": { }
        }
      }
    }
  ```

  **Overrides example:**

  ```json
  {
    "flows": {
      "default": {
        "web": {},
        "bundle": {
          "packages": {
            "@walkeros/web-destination-amplitude": {}
          },
          "overrides": {
            "@amplitude/analytics-types": "2.11.1"
          }
        }
      }
    }
  }
  ```

  Overrides only substitute **transitive** dependencies during resolution —
  direct package specs declared in `bundle.packages` always win. Overrides
  targeting a direct local-path package emit a warning and are ignored. Peer
  constraint mismatches against the chosen override emit a warning but do not
  error (the override is an explicit user directive).

- 08c365a: Add preview mode preflight to web bundles
  - `WrapSkeletonOptions` accepts optional `previewOrigin` and `previewScope`
    fields
  - `generateWrapEntry` injects a preflight snippet before `startFlow` when both
    are set: checks `?elbPreview` param / cookie, loads preview bundle from
    `{previewOrigin}/preview/{previewScope}/walker.{token}.js`, skips production
    flow. Zero overhead when preview options are absent.
  - Input validation rejects path-traversal in `previewScope` and special
    characters in `previewOrigin`.

- 08c365a: Bundle /dev exports into stage 1 skeleton for environment-agnostic
  simulation
  - `/dev` exports from packages are included in the skipWrapper bundle as
    `__devExports`
  - Stage 2 production bundles tree-shake dev exports (no size impact)
  - `prepareFlow()` accepts `Flow.Config` object or pre-built `bundlePath`
  - Simulate functions read env/createTrigger from bundle instead of filesystem

### Patch Changes

- ae02457: Fix bare filename resolution in bundle command —
  `walkeros bundle flow.json` now resolves relative to cwd instead of CLI
  examples directory. Add TTY hint when writing to stdout
- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0
  - @walkeros/server-core@3.3.0

## 3.2.0

### Minor Changes

- eb865e1: Add chainPath to ingest metadata and support path-specific mocks via
  --mock destination.ga4.before.redact='...'
- f007c9f: Wire initConfig.hooks into collector instance. Simulation uses
  prePush/postDestinationPush hooks for event capture. Hooks are wired by
  startFlow before events fire.
- da0b640: Add include/exclude destination filter to collector.push PushOptions.
  Sources can now control which destinations receive their events. Destination
  simulation uses the full collector pipeline with include filter, giving
  production-identical event enrichment, consent, and mapping.
- a0b019f: Add --snapshot flag to push command for setting up global state
  before bundle execution
- 431be04: Refactor bundler to two-step compilation: ESM code compilation +
  platform wrapper. Config changes no longer require full rebuilds. Production
  bundles carry zero dev/simulate code.
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

- f55fc1d: Unify duplicated CLI patterns for reliability and consistency
  - Add unified event validator with graduated levels (strict/standard/minimal)
  - Fix package resolution in simulate to respect packages.path from flow config
  - Extract shared readStdinToTempFile utility, remove copy-paste dynamic
    imports
  - Standardize duration output to milliseconds (matching MCP schema contract)
  - Fix temp file cleanup in run command (hot-swap accumulation, shutdown
    handler)
  - Fix simulator bare /tmp cleanup bug
  - Unify URL fetching into shared fetchContentString, eliminate temp file
    roundtrip
  - Refactor loadJsonFromSource as thin wrapper around loadJsonConfig
  - Remove unused downloadFromUrl function

- bbbeba1: Replace externalServer hack with typed sourceSettings override in
  bundle wrapper
- 7d1a268: Polyfill fetch and navigator.sendBeacon in JSDOM during web
  simulation to prevent throws and capture network calls
- 616b9b2: Resolve transitive dependencies from local path packages
  automatically
- 91159be: Support path-based package: references on flow config components
- 2cc1b54: Support single .ts files and directories without package.json as
  local packages in flow.json
- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
  - @walkeros/core@3.2.0
  - @walkeros/server-core@3.2.0

## 3.1.1

### Patch Changes

- a5d98d2: Fix inline JSON config support in detectInput for MCP tools
  (flow_simulate, flow_push)
  - @walkeros/core@3.1.1
  - @walkeros/server-core@3.1.1

## 3.1.0

### Minor Changes

- 357aa95: Consolidate HTTP patterns into core/http.ts: apiFetch
  (authenticated), publicFetch (unauthenticated), deployFetch (deploy token
  priority), and mergeAuthHeaders. Remove duplicated resolveBaseUrl alias and
  legacy authenticatedFetch/deployAuthenticatedFetch from auth.ts.
- 8e687a6: Server bundles are now fully self-contained — all npm dependencies
  (including express and cors) are bundled into the output. No node_modules
  needed at runtime.
- df990d4: Unified source simulation input. All source simulation uses
  SourceInput { content, trigger?, env? } — one format for CLI, MCP, and tests.
  Removes legacy runSourceLegacy and deprecated SimulateSource fields. CLI gains
  --step flag. MCP flow_simulate drops example parameter (use flow_examples to
  discover, then provide event). flow_examples now returns trigger metadata.
  StepExample Zod schema aligned with TypeScript type.

### Patch Changes

- fc67b30: Auto-add npm packages from flow steps (sources, destinations,
  transformers, stores) to build packages, eliminating the need for a redundant
  `packages` section
- dfc6738: MCP api tool: replace overloaded `id` param with explicit `projectId`
  and `flowId`. CLI functions now throw structured ApiError with code and
  details from the API response. mcpError forwards structured error data to MCP
  clients.
- 5799262: Fix MCP issues from user feedback: add 'entry' to validate output
  type, include version in feedback payload, require Node >=20, support inline
  JSON in loadJsonConfig for sandboxed environments
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/core@3.1.0
  - @walkeros/server-core@3.1.0

## 3.0.2

### Patch Changes

- afd4d07: Add feedback command and MCP tool for sending user feedback
  - @walkeros/core@3.0.2
  - @walkeros/server-core@3.0.2

## 3.0.1

### Patch Changes

- 86c81d1: Regenerate OpenAPI spec and types from app v3
  - @walkeros/core@3.0.1
  - @walkeros/server-core@3.0.1

## 3.0.0

### Major Changes

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

- d5af3cf: Unified CLI and Docker runner into single `walkeros run` code path
  with built-in health server, heartbeat, polling, and secrets support. Added
  `--flow-id` and `--project` flags. Removed legacy `--deploy`, `--url`,
  `--health-endpoint`, `--heartbeat-interval`, and `-h/--host` flags.

### Minor Changes

- 6ae0ee3: Add v2 structured contract format with globals, context, custom,
  user, and consent sections.

  Contracts can now describe cross-event properties (globals, consent, etc.)
  alongside entity-action event schemas. Top-level sections are JSON Schemas
  that merge additively into per-event validation.

  Breaking: None. Legacy flat contracts continue working unchanged. v2 is opt-in
  via `version: 2` field.

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

- ddd6a21: Generated Dockerfiles now include COPY lines for `include` folders,
  enabling fs store support in Docker containers.
- 5cb84c1: Replace hand-written MCP resources with auto-generated JSON Schemas
  from @walkeros/core. Add walkerOS.json to 5 transformer packages. Variables
  resource remains hand-maintained (runtime interpolation patterns).
- 67dd7c8: Standardize command pattern: all three commands (validate, simulate,
  push) now route through their programmatic APIs for string resolution and
  orchestration. Extract shared createCollectorLoggerConfig utility. Pass
  missing silent/step options through simulate() API.
- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- 55ce33e: Fix $store: forward reference bug in bundler codegen — stores are now
  hoisted into a separate variable declaration before the config object,
  ensuring store references resolve correctly at runtime
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
  - @walkeros/server-core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/server-core@2.1.1

## 2.1.0

### Minor Changes

- cb2da05: Add data contracts for centralized event validation and documentation
- fed78f0: Replace deployment polling with SSE streaming for real-time status
  updates
- 3eb6416: Add unified `env.respond` capability. Any step (transformer,
  destination) can now customize HTTP responses via
  `env.respond({ body, status?, headers? })`. Sources configure the response
  handler — Express source uses createRespond for idempotent first-call-wins
  semantics. CLI serve mode removed (superseded by response-capable flows).
- 39780b0: Add event usage counters to heartbeat reporting
- dd53425: Simplify `walkeros run collect` to `walkeros run` — the mode concept
  has been removed
- 66aaf2d: Runner-owned health server: The runner now provides /health and
  /ready endpoints independently of flow sources. Express source's `status`
  setting and fetch source's `healthPath` setting have been removed — health
  endpoints are no longer source responsibilities.
- 97df0b2: Simplify validate command: file-first argument, --type defaults to
  flow, deep validation merged into flow, entry validation moved to --path
- 026c412: Unified simulation API: single simulate() function replaces
  simulateSource/simulateDestination/simulateTransformer/simulateFlow. Built-in
  call tracking for destinations via wrapEnv. No bundling required for
  simulation.

### Patch Changes

- fed78f0: Show logo only on bare `walkeros` call, not before every command
- 7b7e37b: Consolidate flow validation to use core's validateFlowSetup, adding
  $var/$def reference checking and IntelliSense context extraction
- 5145662: Use os.tmpdir() as default temp directory to fix permission errors in
  containers
- 02a7958: Add WARN log level (ERROR=0, WARN=1, INFO=2, DEBUG=3). Logger
  instances expose `warn()` method routed to `console.warn` and `json()` method
  for structured output. Config accepts optional `jsonHandler`. MockLogger
  includes both as jest mocks. CLI logger unified with core logger via
  `createCLILogger()` factory.
- 3bc32de: Surface mapping field in examples_list and ExampleLookupResult
- 5145662: Add --output URL support, -f shorthand for --flow, and lazy-load
  esbuild in runtime
- 7fc4cee: Fix server bundle port forwarding from runtime context to source
  configs
- 1876bb9: Remove unused bundle simulation path, CallTracker, and executor files
  from simulate command. Simulate now only accepts Flow.Setup config JSON files.
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
  - @walkeros/server-core@2.1.0

## 2.0.1

## 2.0.0

### Minor Changes

- a2f27d4: Add deploy command for web and server deployments
- 7b2d750: Add walkerOS.json package convention for CDN-based schema discovery

### Patch Changes

- 1ae6972: Fix missing trailing newline in JSON output
- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0
  - @walkeros/server-core@2.0.0

## 1.3.0

### Minor Changes

- 087eb2d: Restructure CLI with auth, projects, flows command groups; MCP wraps
  CLI functions instead of reimplementing API logic
- 087eb2d: Add Unix-standard stdio support: results to stdout, logs to stderr,
  stdin auto-detection, -o for file output

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0
  - @walkeros/server-core@1.0.5

## 1.2.0

### Minor Changes

- cc68f50: Add validate command for events, flows, and mappings
  - `walkeros validate event` - validates event structure using
    PartialEventSchema
  - `walkeros validate flow` - validates flow configurations using SetupSchema
  - `walkeros validate mapping` - validates mapping event patterns

  Includes programmatic API via `import { validate } from '@walkeros/cli'`

## 1.1.3

### Patch Changes

- 6fcfaf5: Fix chain property handling for all component types in bundler.
  Sources now correctly output `next` property for pre-collector transformer
  chains. Unified inline code generation for sources, destinations, and
  transformers. Standardized transformer `next` as top-level property
  (consistent with destination `before`).

## 1.1.2

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2
  - @walkeros/server-core@1.0.4

## 1.1.1

### Patch Changes

- 6256c12: Add inline code support for sources, transformers, and destinations
  - Add `InlineCodeSchema` with `push`, `type`, and `init` fields for embedding
    JavaScript in flow configs
  - Make `package` field optional in reference schemas (either `package` or
    `code` required at runtime)
  - Update `flow-complete.json` example with inline code demonstrations
    including enricher transformer, debug destination, and conditional mappings

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1
  - @walkeros/server-core@1.0.3

## 1.1.0

### Minor Changes

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

- fdf6e7b: Add transformer support to CLI bundler
  - Detect and bundle transformer packages from flow.json configuration
  - Support transformer chaining via `next` field
  - Handle `$code:` prefix for inline JavaScript in transformer config
  - Generate proper import statements and config objects for transformers
  - Document transformer configuration in flow.json

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0
  - @walkeros/server-core@1.0.2

## 1.0.2

### Patch Changes

- 2709933: Add `$code:` prefix support for inline JavaScript in flow.json

  Values prefixed with `$code:` are output as raw JavaScript instead of quoted
  strings in the bundled output. This enables features like `fn:` callbacks and
  `condition:` predicates directly in JSON configuration files.

  Example:

  ```json
  { "fn": "$code:(value) => value.toUpperCase()" }
  ```

  Outputs:

  ```javascript
  {
    fn: (value) => value.toUpperCase();
  }
  ```

- 04469bb: Auto-detect default export for sources and destinations

  Sources and destinations now automatically use their package's default export,
  eliminating the need to specify `imports` for the main function.

  Before (verbose):

  ```json
  "@walkeros/web-source-browser": { "imports": ["sourceBrowser"] }
  ```

  After (simpler):

  ```json
  "@walkeros/web-source-browser": {}
  ```

  The `imports` field is now only needed for utility functions. Explicit `code`
  still works for packages without default exports.

- 544a79e: Implicit collector: auto-add @walkeros/collector when
  sources/destinations exist

  The CLI now automatically adds `@walkeros/collector` and imports `startFlow`
  when your flow has sources or destinations. No need to declare the collector
  package.

  Before (verbose):

  ```json
  "packages": {
    "@walkeros/collector": { "imports": ["startFlow"] },
    "@walkeros/web-source-browser": {},
    "@walkeros/destination-demo": {}
  }
  ```

  After (simpler):

  ```json
  "packages": {
    "@walkeros/web-source-browser": {},
    "@walkeros/destination-demo": {}
  }
  ```

  You only need to specify `@walkeros/collector` when you want to pin a specific
  version or use a local path for development.

- 4da2ef3: Fix CLI commands hanging after completion

  Commands (`bundle`, `simulate`, `push`) would hang indefinitely after
  completing successfully due to open handles keeping the Node.js event loop
  alive.

  Root cause: esbuild worker threads and pacote HTTP keep-alive connections were
  not being cleaned up.

  Fixes:
  - Add `esbuild.stop()` after builds to terminate worker threads
  - Add explicit `process.exit(0)` on successful completion for all CLI commands

- 2f82a2e: Fix simulate command JSON output to use consistent `result` property
  instead of `elbResult`
- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0
  - @walkeros/server-core@1.0.1

## 1.0.1

### Patch Changes

- eb878df: Improved CLI option consistency and added `--dockerfile` flag
  improvements

  **Option consistency:**
  - Added `--flow` option to simulate command for multi-flow configs
  - Standardized `-v/--verbose` and `-s/--silent` shortcuts across all commands
  - Removed non-functional `--dry-run` option from all commands
  - Removed `-f` shortcut from bundle (use `--flow` for consistency)
  - Unified option description casing (lowercase)

  **Dockerfile improvements:**
  - Generate correct `MODE=serve` for web flows and `MODE=collect` for server
    flows
  - Support copying custom Dockerfiles with `--dockerfile path/to/Dockerfile`
  - Respects `--flow` parameter for multi-flow configurations

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0
  - @walkeros/server-core@1.0.0
