---
'@walkeros/core': patch
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

`@walkeros/core` exports the `StepType` type, the kind of a step package
(`source`, `transformer`, `destination` or `store`), read from `STEP_TYPES` on
`@walkeros/core/dev`. `StepKind`, `FlowStepType` and `stepId` use it, as do the
step kinds `resolveExportName` in `@walkeros/cli` and the simulate tool of
`@walkeros/mcp` take, so the kinds are listed in one place.
