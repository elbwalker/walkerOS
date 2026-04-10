---
'@walkeros/core': minor
'@walkeros/collector': minor
---

Add `include` as a first-class field on `Destination.Config` (destination-level)
and `Mapping.Rule` (per-event override). The collector resolves `include` in
`processEventMapping` before calling `push()`, flattening specified event
sections into prefixed key-value pairs (e.g. `data_price: 420`) and merging them
as the bottom layer of `context.data`.

Rule-level `include` replaces config-level (not additive). Merge priority:
include (bottom) → config.data → rule.data (top, wins on conflict). The
`context` section correctly extracts `[0]` from OrderedProperties tuples.

New export: `flattenIncludeSections(event, sections)` from `@walkeros/core`.
