# @walkeros/runner

## 4.10.0

### Minor Changes

- 61030f8: `status.destinations[id].count` and `status.out` count delivered
  events, one per event for a single push, a batch and a before-chain fan-out
  alike. A rule's `ignore: true` now counts in
  `status.destinations[id].ignored`, and `skipped` counts consent skips only.
  `status.dropped` also holds the routine drops at the source and collector
  positions (`consent`, `ignored`, `stopped`), and `destinations[id].latency` is
  a delivery latency histogram (`LATENCY_BOUNDS_MS` and `latencyBucket` are
  exported by `@walkeros/core`).

  Migration:
  - An alarm that sums every entry of `status.dropped` now fires on intended
    drops. Read the `queue` and `dlq` counters for buffer overflow.
  - A consumer that read `skipped` for rule ignores reads `ignored`.
  - A destination's counts, failure lines and cause steps sit under `config.id`,
    else its key. A destination whose `config.id` differs from its key now
    counts everything under the id.
  - A destination-level drop (a `before` chain drop, a cache hit) is still
    counted nowhere.

- 61030f8: `startFlow({ observe })`, or `collector.observe` in a flow file,
  starts the Observe reporter: `usage` posts counters, gauges and issues every
  `interval` (10 to 300 seconds, default 60), and `preview` posts one row per
  event and per destination outcome, as NDJSON with a Bearer token. It is never
  awaited on the event path, and a failing report is one ERROR line a minute. A
  production web bundle carries no reporter; only a preview build, whose browser
  wrap is given `observe: { preview: { url, token } }`, does. On the minimal
  flow that build grows by 16,064 bytes raw and 6,308 gzipped. `walkeros push`
  and simulate send nothing.

  Migration:
  - `Logger.Config.mask` is optional and `Logger.Instance.mask(text)` is
    required. A logger built by hand needs a `mask`; `mask: (text) => text` is
    enough.
  - `createBatchedPoster` posts rows of any shape and returns
    `{ push, flush, send, dropped }`; its versioned envelope, `onError` and
    `onStatus` are gone, and `onResult` says whether a post was a page leave's
    `keepalive` one. A page-leave body is at most `KEEPALIVE_BODY_BYTES`
    (16,384).
  - `redactLine` is exported from `@walkeros/core` too (`scrubSecrets` stays in
    `@walkeros/core/node`). Both mask every `wos_` token and the credential
    after `Bearer` or `Basic`.
  - `FlowState.seq` and `'sampled_out'` are removed from `skipReason`; nothing
    set them.

- 61030f8: Observe v1 is removed: no `elbObserve` URL parameter, no Observe
  sessions, no journey assembly and no trace-level capture of vendor calls. The
  new Observe reporter replaces it (see the Observe reporter changeset).

  Migration:
  - Delete `config.observe`, `collector.observe` of the old shape, the `observe`
    `startFlow` option, `pageObserveSlot`, `elbPreviewSession` and the `observe`
    wrap option. `flows.<name>.config` now accepts only `platform`, `url`,
    `settings` and `bundle`; any other key fails `walkeros validate` with
    `UNKNOWN_KEY` at its path.
  - `observeEnv` is now `recordEnv` and `ObservedEnv` is `RecordedEnv`, with no
    alias. The recorder takes no `record` callback and reports no `unresolved`
    paths, and `wrapEnv` no longer returns `unresolved`.
  - Removed from `@walkeros/core`: `observeFromEnv`, `assembleJourneys` and the
    journey types, `createTelemetryObserver`, the trace state helpers,
    `Destination.Instance.calls`, `Collector.Instance.observeLevel` and
    `FlowState.calls`. The `observers` option and `FlowState` stay.
  - A page on the new web-core no longer strips the old `elbObserve` and
    `elbPreviewSession` URL parameters (`elbPreview` is still stripped). The
    preview grant verifier takes a page and its origin only (`origin` is
    required); the `ses` and `sb` claims are gone.
  - The runner no longer reads `WALKEROS_OBSERVE_LEVEL`, the observer variables
    or the `WALKEROS_PREVIEW_*` intake variables, and `createHealthServer` takes
    `(port, logger)`. The `previewGrantTargets` wrap option is removed.

- e3744e4: The Observe usage report carries the memory, CPU time and event loop
  delay of the process that runs the flow, as `runtime` rows. `runneros` fills
  them every 10 seconds through the new `status.runtime`
  (`Collector.RuntimeStatus`); a collector without such a host sends none, and a
  flow that reports changes no option.
- 425c9b0: Runners, scripts and CI now connect to the walkerOS app with one
  credential in `WALKEROS_CREDENTIAL`: pair a runner on its flow part's
  Self-hosted tab, or create an automation under Account, and the auth host
  shows it once. The credential itself is never sent: it buys short-lived tokens
  bound to its key, and a runner signs its requests when the auth server cannot
  be reached, so it keeps serving. `walkeros auth token` prints a 1-hour bearer
  token of an automation for `curl`.

  Migration: `WALKEROS_TOKEN` and `WALKEROS_DEPLOY_TOKEN` are gone, and so are
  `runneros start`'s `--flow-id` and `--project` and its `WALKEROS_APP_URL`,
  `WALKEROS_PROJECT_ID`, `WALKEROS_FLOW_ID` and `WALKEROS_DEPLOYMENT_ID`, the
  CLI's `resolveAccessToken` and the runner's `resolveRunToken` and
  `resolveAppUrl`; set `WALKEROS_CREDENTIAL` from a pairing or an automation.

### Patch Changes

- 777c48d: Log lines are masked once, and only when they leave the process
  (printed, written to the error file or sent to the app), so masking costs far
  less on a busy flow. Without `--flow-id` the runner keeps no log or error
  ring, as nothing reads them.

  Migration: `onLine` now receives a `TappedLine`, the function form of
  `knownSecrets` is gone, ring entries carry `line`, and
  `PipelineOptions.knownValues` is required.

- 777c48d: A server artifact now names the secrets and environment values its
  flow reads. The runner sets only those names, refuses a reserved or already
  set name, masks every declared value and reports its release. A name the app
  delivers that the flow reads only from code (a `$code:` value, or a package
  that reads `process.env` itself, such as an SDK's default credential name) is
  no longer set. The reserved names include every `LD_` and `DYLD_` name.

  Migration: a name that is both in the environment and in the app now stops the
  boot, so keep one source. App values are now set after the artifact is
  imported and before it starts, so a package that reads such a name at import
  time no longer sees it, while inline code is not affected.

- 527c632: Outside the image, `runneros start` extracts archives into a private
  folder under the system temp directory, and the `Instance` line prints its id
  readable. Migration: `getInstanceId` is gone and `newInstanceId` is exported
  in its place, `HeartbeatConfig.instanceId` and `PipelineOptions.instanceId`
  are now required, the error file is now `errors-<port>.jsonl`, and
  `@walkeros/runner` now depends on `@walkeros/server-core`. `resolveBundle`
  returns the private folder as `folder`; the caller removes it.
- 6d59900: `runneros remote` takes releases from the walkerOS app with the
  runner's credential, keeps their secret values sealed in its cache and signs
  its flow's ingest writes through the supervisor. `runneros start` no longer
  reads `WALKEROS_FLOW_RELEASE` or `WALKEROS_FLOW_NAME`, since a remote release
  checks its artifact's sha256 before any code runs.
- 6d59900: A remote runner fetches the web files its server release lists and
  replaces them with no restart when a web part is released. A web file is
  checked against its own release before it is placed, and a fetch that fails
  keeps the file that serves.
- 777c48d: Shutdown drains within one 8 second deadline. The result names each
  failed destination and whether its flush or its close failed, and the runner
  exits 1 when events were lost or a destination did not close cleanly.

  Migration: set the platform's grace period to at least 10 seconds. Sources
  close first and their close counts toward the 8 seconds, so a source
  `shutdownTimeoutMs` above 5000 takes time from the batch flush.

- f1745d7: A paired runner now signs its writes to walkerOS hosted ingest with
  its own credential key, so a flow needs no ingest token: the usage report
  signs each report when it names no token, and the ClickHouse destination signs
  each insert when its settings set `signed: true`. Any other endpoint or
  ClickHouse keeps its token or credentials as before and is never signed for.
- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [4938120]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [527c632]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0
  - @walkeros/server-core@4.10.0

## 4.9.0

### Patch Changes

- 125bbea: The `walkeros/flow` and `walkeros/cli` images now run Node.js
  24.22.1, which fixes the vulnerabilities of the Node.js security release of 21
  October 2026; one of them can be triggered by a request to a flow's HTTP
  source. Rebuild images based on `walkeros/flow` with this version and
  redeploy. Flows that run on their own Node.js need 22.23.4, 24.22.1, 26.12.1
  or later in the same line.
- Updated dependencies [a67546d]
- Updated dependencies [1306d8a]
- Updated dependencies [34fd225]
- Updated dependencies [5313635]
- Updated dependencies [1306d8a]
- Updated dependencies [fa46337]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [34fd225]
- Updated dependencies [fa46337]
- Updated dependencies [1306d8a]
- Updated dependencies [5313635]
  - @walkeros/core@4.9.0

## 4.8.2

### Patch Changes

- 964590a: Auth header records skip undefined values.
- 2374f54: A flow's `logger.level` and `logger.format` apply to the collector's
  lines, and the format to the runner's own lines; `--verbose` still forces
  DEBUG. A flow's `logger.level`, DEBUG included, applies to the collector's
  lines without `--verbose`. `flow handler error` logs at ERROR, a rejected
  heartbeat at WARN, and Node process warnings go through the logger at WARN.
- Updated dependencies [2374f54]
- Updated dependencies [7e5fc27]
- Updated dependencies [2374f54]
- Updated dependencies [964590a]
- Updated dependencies [4100ede]
- Updated dependencies [2374f54]
- Updated dependencies [2374f54]
- Updated dependencies [15eb7b2]
- Updated dependencies [33a2779]
- Updated dependencies [33a2779]
  - @walkeros/core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1

## 4.8.0

### Patch Changes

- 5593d7b: The runner refuses to start when the loaded flow does not match
  `WALKEROS_FLOW_RELEASE` (and `WALKEROS_FLOW_NAME`, when set), so a container
  never serves an artifact other than the one it was deployed with. Every start
  logs the loaded flow's name and release.
- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2

## 4.7.1

### Patch Changes

- 91e9aeb: New `walkeros diagnostics` command shows the CLI version, app URL,
  app health and an API compatibility verdict checked per operation against the
  live app; the MCP `diagnostics` tool reports it too and
  `walkeros://reference/openapi` serves the live document. `compareContract` and
  `ContractComparison` are reshaped, `annotateErrorWithDrift` is removed, and
  deployment listing rejects an unknown `status` or `type`.
- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
  - @walkeros/core@4.7.1

## 4.7.0

### Minor Changes

- 06b498a: `walkeros run` is removed. Build with `walkeros bundle`, then start
  the artifact with `runneros start dist/flow.mjs` from the new
  `@walkeros/runner` package, which the `walkeros/flow` image now runs. The CLI
  no longer depends on `express`, `cors` or `p-limit`. New `@walkeros/core/node`
  entry with the Node-only logger, redaction and temp-path helpers.

### Patch Changes

- 74821ed: Simulate and push output, CLI and flow logs, and the MCP
  `flow_simulate` and `flow_push` results mask the values of secrets a flow
  references, also inside JSON strings, numbers and URLs. `scrubSecrets` takes
  `known`, the CLI logger `knownSecrets`, and `scrubJson` replaces
  `maskKnownNumbers`. MCP `flow_push` and `flow_simulate` read their config
  once; a config that cannot be read stops the run.
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/core@4.7.0
