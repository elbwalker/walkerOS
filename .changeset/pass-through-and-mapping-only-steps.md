---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/cli': minor
'@walkeros/mcp': minor
---

Pass-through transformer steps + closed-schema validation.

**Validation:** `validateTransformerEntry` in `@walkeros/core` is now the single
source of truth. Bundler, `flow_validate`, and collector runtime all delegate.
Closed schema: unknown top-level keys are errors. `code` + `package` together is
a `CONFLICT`.

**Pass-through steps:** A transformer entry with no `code` and no `package` is
valid; the collector synthesizes its push. Three variants:

- before/next chain only (named hop)
- cache only (e.g. dedup)
- mapping only (event-to-event transform via `Mapping.Config`)

**Mapping at the transformer position:** new `mapping?: Mapping.Config` field on
`Transformer.Config` / `InitTransformer`. Same shape as
`Destination.Config.mapping`, event-to-event semantic. `data` / `silent` are
ignored at the transformer position with a one-time warning.

**Engine tag:** synthesized instance now uses `type: 'pass'` (was `'path'`).
Hard cut.

**Runtime fixes:**

- `compileNext` handles mixed-shape `next` arrays (`["a", { case }]`) via a new
  `'sequence'` variant.
- A destination's `before` referencing a pass-through transformer now walks that
  transformer's own `before` / `next`.
- `cache.stop: true` at a pre-collector transformer halts the pipeline (matches
  `cache.mdx`).

**Migration:** Typo keys on a step now fail validation.
`instance.type === 'path'` consumers must read `'pass'`. `runTransformerChain`
consumers should branch on the new `stopped` flag.
