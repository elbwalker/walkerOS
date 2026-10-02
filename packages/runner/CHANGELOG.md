# @walkeros/runner

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
