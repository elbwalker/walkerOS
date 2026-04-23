---
'@walkeros/core': patch
---

JSON Schema exports now include canonical `id` + `title` (e.g.
`Destination.Config`, `Logger.Config`) — replaces anonymous `__schema0` /
`object` / `any` labels. Extracts shared `LoggerConfigSchema` (was inlined 5×).
Removes deprecated `schemas/value-config.ts`. No TypeScript surface changes.
