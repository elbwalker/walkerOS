---
'@walkeros/web-source-datalayer': patch
---

Removed the `MappingSchema` and `Mapping` exports and the `settings.command`
rule option. The runtime never read `command`, so a consent rule only renames
the push to `walker consent` and the consent fields stay in `data`, as the
updated example shows.
