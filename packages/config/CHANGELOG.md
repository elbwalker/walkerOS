# @walkeros/config

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
