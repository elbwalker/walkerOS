# @walkeros/mcp

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
