---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/processor-demo': minor
---

Add processor chaining for event transformation pipelines

- Added `Processor` types to `@walkeros/core` with `Init`, `Instance`, `Fn`,
  `Context`, and configuration types following Source/Destination patterns
- Extended `Flow.Config` with `processors` section and added `next` property to
  `SourceReference`, `before` property to `DestinationReference`
- Added Zod schemas for processor validation with JSON Schema generation
- Implemented `runProcessorChain()` in collector for executing processor chains
- Modified `push.ts` to run pre-collector chains (source → processors →
  collector)
- Modified `destination.ts` to run post-collector chains per destination
- Created `@walkeros/processor-demo` package as reference implementation
