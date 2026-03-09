---
'@walkeros/core': patch
---

Fix $var/$def/$env resolution in transformer configs and env fields

Previously, `resolvePatterns` was not called on transformer configs or any
component's `env` field. This meant `$var.name`, `$def.name`, and `$env.NAME`
references in those positions were passed through as literal strings. Now all
component types (sources, destinations, transformers, stores) have both `config`
and `env` resolved consistently.
