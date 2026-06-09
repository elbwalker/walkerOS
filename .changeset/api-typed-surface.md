---
'@walkeros/cli': patch
---

The bundled API contract (`spec.json` and the generated `api.gen.d.ts`) now
covers the full served surface, adding typed paths for service accounts,
invitations, billing, deployments and their sub-resources, custom domains,
entitlements, LLM settings, chat sessions, MCP tokens, runners, and the package
catalog. No runtime behavior change; clients gain accurate types for these
endpoints.
