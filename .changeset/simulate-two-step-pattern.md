---
'@walkeros/cli': minor
---

Bundle /dev exports into stage 1 skeleton for environment-agnostic simulation

- `/dev` exports from packages are included in the skipWrapper bundle as
  `__devExports`
- Stage 2 production bundles tree-shake dev exports (no size impact)
- `prepareFlow()` accepts `Flow.Config` object or pre-built `bundlePath`
- Simulate functions read env/createTrigger from bundle instead of filesystem
