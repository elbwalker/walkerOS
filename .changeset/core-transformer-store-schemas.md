---
'@walkeros/core': patch
---

Add `TransformerSchemas` and `StoreSchemas` namespaces with `ConfigSchema` /
`configJsonSchema` exports. Mirrors the existing `DestinationSchemas` /
`SourceSchemas` pattern so every component type has a documented Config schema
available via `@walkeros/core/dev`.

Reconcile pre-existing drift between TS Config interfaces and their Zod schemas:

- `DestinationSchemas.ConfigSchema` now includes `before`, `next`, `cache`,
  `disabled`, `mock`, `include` (matching `Destination.Config`) and drops
  phantom `onError` / `onLog` fields that were never wired in the TS type or
  consumed at runtime.
- `SourceSchemas.ConfigSchema` now includes `disabled` and drops a phantom
  `onError` field.
- `MappingSchemas.ConfigSchema` now includes `include`, matching
  `Mapping.Config` (the base `Source.Config` extends).
- `CollectorSchemas.ConfigSchema` now includes `logger` and drops phantom
  `verbose` / `onError` / `onLog` fields not present in `Collector.Config`.
- `CollectorSchemas.InitConfigSchema` now includes `transformers`, `stores`,
  `hooks`, matching `Collector.InitConfig`.

Add a compile-time drift guard at
`packages/core/src/schemas/__tests__/config-drift.test-d.ts`. Any future
divergence between a Config TS interface and its Zod schema fails `tsc --noEmit`
(already wired into the project's `typecheck` script and CI). Keys-only check;
value types may still differ for recursive or generic-slot fields where Zod
cannot express TS-side precision.
