---
'@walkeros/cli': major
'@walkeros/mcp': major
---

Remove dead `bundleRemote()` and add OpenAPI drift detection.

Breaking changes:

- Removed `bundleRemote()` export from `@walkeros/cli`. The corresponding
  `/api/bundle` endpoint was removed from the walkerOS app on 2026-04-08, so
  this function had been silently broken in production for ~3 weeks. Local
  bundling via `bundle()` is unaffected.
- Removed `remote` and `content` options from the MCP `flow_bundle` tool. The
  tool now bundles locally only.

New:

- Added `npm run -w @walkeros/cli validate:openapi-spec` script that diffs the
  checked-in `packages/cli/openapi/spec.json` against the live app's OpenAPI
  document. Detects drift between the walkerOS-side type contract and the actual
  API. Wired into PR-time CI, daily cron, and a pre-commit lint-staged hook. All
  layers are gated on a `WALKEROS_APP_URL` secret and skip silently when unset,
  so the change ships safely without configuration. To activate: set
  `WALKEROS_APP_URL` in repo secrets pointing to a deployed app instance.
