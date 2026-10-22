# @walkeros/runner

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
