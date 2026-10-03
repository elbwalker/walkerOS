# @walkeros/config

## 4.7.1

## 4.7.0

### Minor Changes

- 64b06de: Packages with several exports, such as the GCP and AWS sources and
  destinations, now publish a settings schema per export. `walkeros validate`
  and MCP `package_get` use the schema of the export a step imports. Pub/Sub,
  BigQuery, SNS and SQS steps pinned to this release or later are checked
  instead of skipped; older pins still report a skip.

### Patch Changes

- 74821ed: Simulate records every vendor call through one recorder, `observeEnv`
  from `@walkeros/core`, and runs offline: BigQuery, Data Manager and the
  Sheets, GCS and S3 stores reach the network through `env`. Client and `Env`
  types of BigQuery, Firehose, PostHog, SQS and Pub/Sub are structural.
  `@walkeros/cli` exports `resolveExportName` and `selectDevExamples` and drops
  `findExample` and `compareOutput`.
- 74821ed: Simulate starts only the simulated step, and a simulated transformer
  continues through its `next`. Source simulations list the commands a source
  issues as `elb` calls; `--page-url` sets the web page. Express flows need no
  port. Packages with several exports use per-export examples and mocks, and a
  destination without a mock env is refused instead of calling the vendor.

## 4.6.1

## 4.6.0

## 4.5.0

## 4.4.0

## 4.3.2

## 4.3.1

## 4.3.0

## 4.2.1

## 4.2.0

## 4.1.2

## 4.1.1

## 4.1.0

## 4.0.2

## 4.0.1

## 4.0.0

## 3.4.2

## 3.4.1

## 3.4.0

## 3.3.1

## 3.3.0

## 3.2.0

## 3.1.1

## 3.1.0

### Patch Changes

- bee8ba7: Replace hardcoded package registry with live npm search. Package
  catalog is now fetched dynamically from npm and enriched with walkerOS.json
  metadata from CDN.

  Change platform type from string to array. Packages declare platform as
  ["web"], ["server"], or ["web", "server"]. Empty array means
  platform-agnostic. The normalizePlatform utility handles backwards
  compatibility with the old string format from already-published packages.

  Remove outputSchema from package_get to prevent SDK validation crashes on
  unexpected field values.

## 3.0.2

## 3.0.1

## 3.0.0

### Patch Changes

- 1fe337a: Add hints field to walkerOS.json for lightweight AI-consumable
  package context.

  Packages can now export a `hints` record from `src/dev.ts` containing short
  actionable tips with optional code snippets. Hints are serialized into
  `walkerOS.json` by buildDev() and surfaced via the MCP `package_get` tool.

  Pilot: BigQuery destination includes hints for authentication, table setup,
  and querying.

## 2.1.1

## 2.1.0

## 2.0.1

## 1.1.0

### Minor Changes

- 7b2d750: Add walkerOS.json package convention for CDN-based schema discovery

## 1.0.2

### Patch Changes

- 2f82a2e: Add modulePathIgnorePatterns to Jest config to prevent Haste module
  collisions with cached packages
