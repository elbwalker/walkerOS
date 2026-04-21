---
'@walkeros/mcp': patch
---

Add `preview.list`, `preview.get`, `preview.create`, and `preview.delete`
actions to the `api` tool. When `siteUrl` is provided to `preview.create`, the
response includes a ready-to-open `activationUrl` and `deactivationUrl`.
