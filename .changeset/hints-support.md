---
'@walkeros/core': minor
'@walkeros/server-destination-gcp': minor
'@walkeros/mcp': minor
'@walkeros/config': patch
---

Add hints field to walkerOS.json for lightweight AI-consumable package context.

Packages can now export a `hints` record from `src/dev.ts` containing short
actionable tips with optional code snippets. Hints are serialized into
`walkerOS.json` by buildDev() and surfaced via the MCP `package_get` tool.

Pilot: BigQuery destination includes hints for authentication, table setup, and
querying.
