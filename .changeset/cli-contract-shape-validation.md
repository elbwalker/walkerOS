---
'@walkeros/cli': patch
---

`walkeros validate --type contract` now rejects the flat contract shape (a bare
entity-action map, or a `$`-prefixed root key) with a `FLAT_CONTRACT_SHAPE`
error, and warns on unrecognized keys instead of ignoring them. Rule-level
`tagging` and `schema` fields are also checked for their expected types.
