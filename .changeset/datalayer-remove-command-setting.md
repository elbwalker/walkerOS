---
'@walkeros/web-source-datalayer': patch
---

Removed the `MappingSchema` export and the `settings.command` rule option; the
`Mapping` type is now an empty interface. The runtime never read `command`, so a
consent rule only renames the push to `walker consent` and the consent fields
stay in `data`, as the updated example shows.
