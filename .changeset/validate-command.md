---
'@walkeros/cli': minor
---

Add validate command for events, flows, and mappings

- `walkeros validate event` - validates event structure using PartialEventSchema
- `walkeros validate flow` - validates flow configurations using SetupSchema
- `walkeros validate mapping` - validates mapping event patterns

Includes programmatic API via `import { validate } from '@walkeros/cli'`
