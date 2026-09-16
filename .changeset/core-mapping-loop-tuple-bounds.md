---
'@walkeros/core': patch
---

The JSON Schema for a mapping loop now sets `minItems` and `maxItems` to 2, so a
settings schema that embeds a mapping value no longer makes
`walkeros validate --path` print an Ajv strict-mode warning. The published Flow
JSON Schema (`schema/flow/v4.json`) was refreshed to match: it now includes
`config.observe` and no longer lists the step-level `validate` field.
