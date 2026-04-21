# @walkeros/config

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
