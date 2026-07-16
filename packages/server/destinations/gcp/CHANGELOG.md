# @walkeros/server-destination-gcp

## 4.3.0

### Patch Changes

- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
  - @walkeros/core@4.3.0
  - @walkeros/server-core@4.3.0

## 4.2.1

### Patch Changes

- 96c791a: The BigQuery destination now applies `config.credentials` to the
  Storage Write client that performs event writes, not just the query client.
  Event writes from the configured service account now succeed on non-Google
  Cloud runtimes instead of failing with a credentials error. Both clients
  resolve credentials the same way, so a destination always authenticates as a
  single identity.
- 8afb7cc: Capture BigQuery Storage Write stream errors so a broken writer
  routes events to the dead-letter queue instead of crashing the process, and
  re-open a broken writer automatically on the next event.
- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1
  - @walkeros/server-core@4.2.1

## 4.2.0

### Minor Changes

- e8f6909: Add an optional, strictly-typed `config.credentials` field to
  destinations, stores, and sources. Service-account credentials now configure
  under `config.credentials`, validated per package and resolved from `$env`.
  The package-specific `settings.credentials` still works but is deprecated, so
  move credentials to `config.credentials`. The raw `settings.<sdk>` passthrough
  (e.g. `settings.bigquery`) is unchanged.

### Patch Changes

- 76d32c1: Batched destination delivery now reports failures. A batch push that
  fails (including BigQuery row errors) is routed to the dead-letter buffer and
  counted as failed instead of being silently dropped, and graceful shutdown
  waits for in-flight batches to finish. Also fixes a shutdown timer that could
  delay process exit, and makes a zero millisecond batch wait (`batch: 0`)
  correctly enable batching.
- db97edc: The BigQuery destination now creates the `timing` column as `FLOAT64`
  instead of `INT64`. Event timing carries sub-second decimal precision, which
  was previously truncated to whole numbers on write. Existing tables keep their
  column type; alter it to `FLOAT64` to preserve precision going forward.
- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [2d64ed2]
- Updated dependencies [e8f6909]
- Updated dependencies [c27d3c1]
- Updated dependencies [654ba38]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
  - @walkeros/server-core@4.2.0

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2
- @walkeros/server-core@4.1.2

## 4.1.1

### Patch Changes

- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/core@4.1.1
  - @walkeros/server-core@4.1.1

## 4.1.0

### Patch Changes

- 5a9a192: The BigQuery Storage Write API data plane now authenticates from
  `settings.bigquery` (e.g. `keyFilename`, `credentials`) instead of always
  falling back to Application Default Credentials. Service-account auth
  configured for setup now also applies to event ingestion.
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
  - @walkeros/server-core@4.1.0

## 4.0.2

### Patch Changes

- @walkeros/server-core@4.0.2

## 4.0.1

### Patch Changes

- 87ffcd7: BigQuery destination: migrate from legacy tabledata.insertAll to the
  BigQuery Storage Write API (~2x cheaper at volume, 2 TiB/month free tier), add
  the `setup()` lifecycle for one-shot dataset and table provisioning via
  `walkeros setup destination.bigquery`, and implement `pushBatch` so the
  collector's `batch: <ms>` mapping setting actually batches into a single
  appendRows call.

  Breaking changes:
  - The 15-column table schema is now using walkerOS event v4 schema.

  Run `walkeros setup destination.bigquery` to provision the dataset and table
  with day partitioning on `timestamp` and clustering on
  `(name, entity, action)`.

- abfb0bb: @walkeros/cli: Server bundles now use @vercel/nft to trace
  dependencies and copy only files actually used into dist/node_modules/. Pacote
  remains the install layer (driven by flow.json's config.bundle.packages field;
  users do not run npm install for step packages). The walkerOS.bundle.external
  annotation field on package manifests is no longer recognized (deprecation
  warning if seen). The flow.<name>.config.bundle.external sub-field on flow
  configs is also no longer supported (warned and stripped during load). The
  flow.<name>.config.bundle.traceInclude field is the escape hatch for cases nft
  cannot statically trace. Server output is always a directory: dist/{flow.mjs,
  package.json, node_modules/}. Default output filename changed from bundle.mjs
  to flow.mjs. The runtime image expects /app/flow/flow.mjs. flow.json schema is
  unchanged (still v4); only @walkeros/cli bumps. Migration: see
  https://walkeros.io/docs/migrate/cli-4x.

  @walkeros/server-destination-gcp: removed obsolete walkerOS.bundle.external
  annotation from package manifest. nft handles externalization automatically.
  No behavior change for consumers.

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

- ed304b4: Declare `@google-cloud/bigquery-storage` as a bundle external via
  `walkerOS.bundle.external`. Fixes
  `__dirname is not defined in ES module scope` when bundling a flow that uses
  BigQuery Storage Write API. The bundler's closure walker pulls in the
  transitive gRPC stack (`@grpc/grpc-js`, `@grpc/proto-loader`, `protobufjs`,
  `google-gax`) automatically via `bigquery-storage`'s own dependencies and
  peerDependencies, so only the one entry needs to be declared. Requires
  `@walkeros/cli` >= the version shipping the bundler-externals feature.
- 1a5915d: Add Pub/Sub sub-destination to the GCP server package. Publishes
  walkerOS events to a Pub/Sub topic with optional per-key ordering and dynamic
  attributes, plus idempotent topic provisioning via
  `walkeros setup destination.<id>`. EU region default for at-rest storage.
  Three auth modes: ADC, service account JSON, pre-configured client.
  - @walkeros/server-core@4.0.1

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

### Patch Changes

- @walkeros/server-core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/server-core@3.4.2

## 3.4.1

### Patch Changes

- @walkeros/server-core@3.4.1

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

- @walkeros/server-core@3.4.0

## 3.3.1

### Patch Changes

- @walkeros/server-core@3.3.1

## 3.3.0

### Patch Changes

- @walkeros/server-core@3.3.0

## 3.2.0

### Patch Changes

- @walkeros/server-core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/server-core@3.1.1

## 3.1.0

### Patch Changes

- @walkeros/server-core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/server-core@3.0.2

## 3.0.1

### Patch Changes

- 86c81d1: Add default export to server-transformer-fingerprint and exports
  metadata to multi-service packages for bundler named import support
  - @walkeros/server-core@3.0.1

## 3.0.0

### Minor Changes

- 1fe337a: Add hints field to walkerOS.json for lightweight AI-consumable
  package context.

  Packages can now export a `hints` record from `src/dev.ts` containing short
  actionable tips with optional code snippets. Hints are serialized into
  `walkerOS.json` by buildDev() and surfaced via the MCP `package_get` tool.

  Pilot: BigQuery destination includes hints for authentication, table setup,
  and querying.

### Patch Changes

- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [499e27a]
  - @walkeros/server-core@3.0.0

## 2.1.1

### Patch Changes

- @walkeros/server-core@2.1.1

## 2.1.0

### Minor Changes

- 97df0b2: Step examples: upgrade all packages to blueprint pattern with inline
  mapping, no intermediate variables, no `all` export

### Patch Changes

- @walkeros/server-core@2.1.0

## 2.0.1

## 1.0.6

### Patch Changes

- @walkeros/server-core@2.0.0

## 1.0.5

### Patch Changes

- @walkeros/server-core@1.0.5

## 1.0.4

### Patch Changes

- @walkeros/server-core@1.0.4

## 1.0.3

### Patch Changes

- @walkeros/server-core@1.0.3

## 1.0.2

### Patch Changes

- 6778ab2: Add default exports for simpler CLI flow.json configuration
  - @walkeros/server-core@1.0.2

## 1.0.1

### Patch Changes

- @walkeros/server-core@1.0.1

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/server-core@1.0.0
