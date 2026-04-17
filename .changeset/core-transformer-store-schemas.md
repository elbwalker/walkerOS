---
'@walkeros/core': patch
---

Add `TransformerSchemas` and `StoreSchemas` namespaces with `ConfigSchema` /
`configJsonSchema` exports. Mirrors the existing `DestinationSchemas` /
`SourceSchemas` pattern so every component type has a documented Config schema
available via `@walkeros/core/dev`.

Also closes a schema/type gap: `DestinationSchemas.ConfigSchema` now includes
`before`, `next`, `cache`, `disabled`, `mock` (matching the TS type
`Destination.Config`), and `SourceSchemas.ConfigSchema` now includes `disabled`.
These fields were added to the TS types but not the Zod schemas; the
Configuration reference tables on the website depend on the schemas being
complete.
