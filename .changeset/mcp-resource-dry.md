---
'@walkeros/core': patch
'@walkeros/mcp': minor
'@walkeros/server-transformer-fingerprint': patch
'@walkeros/server-transformer-cache': patch
'@walkeros/transformer-router': patch
'@walkeros/transformer-demo': patch
'@walkeros/server-transformer-file': patch
'@walkeros/cli': patch
---

Replace hand-written MCP resources with auto-generated JSON Schemas from
@walkeros/core. Add walkerOS.json to 5 transformer packages. Variables resource
remains hand-maintained (runtime interpolation patterns).
