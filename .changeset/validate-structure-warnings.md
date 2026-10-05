---
'@walkeros/cli': patch
---

`walkeros validate` and MCP `flow_validate` now show the structural warnings of
a flow, such as a transformer mapping field that does nothing
(`TRANSFORMER_MAPPING_NO_OP`), as warnings, not errors.
