---
'@walkeros/core': major
'@walkeros/cli': minor
'@walkeros/mcp': minor
'@walkeros/explorer': minor
---

**Breaking — `@walkeros/core`:** `fetchPackage(name, { baseUrl })` now expects
the host app to expose the v2 `/api/packages/[name]` endpoint that returns the
merged `WalkerOSPackage` shape directly (single round-trip, `?expand=all`). The
previous two-fetch pattern (`?path=package.json` + `?path=dist/walkerOS.json`)
is removed. Hosts must serve the v2 shape; the offline jsdelivr fallback is
unchanged.

**Feature — CLI/MCP/explorer:** Outbound walkerOS-aware HTTP clients now
identify themselves to the configured app origin via
`X-Walkeros-Client: walkeros-{cli|mcp}/{version}`. `@walkeros/explorer` exports
`setPackageTypesBaseUrl(url?)` so host apps can proxy `.d.ts` through their own
origin (used by the walkerOS Tag Manager app to drop the jsdelivr CDN allowance
entirely).
