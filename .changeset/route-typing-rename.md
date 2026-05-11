---
'@walkeros/core': patch
'@walkeros/cli': patch
---

Rename routing types: `NextRule` to `Route`, `Next` to `RouteSpec` (Zod schemas
and `MatcherNext*` IDs renamed in step). Widen `Flow.*.before/next` to
`RouteSpec` so `Route[]` conditional routing type-checks at the JSON layer. Fix
the CLI bundler dropping `Route[]` data via a narrowing cast on the inline path.
Hard cut, no aliases; flow.json shape unchanged.
