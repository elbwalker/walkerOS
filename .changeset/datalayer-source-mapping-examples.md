---
'@walkeros/web-source-datalayer': patch
'@walkeros/cli': patch
---

Source-level mapping examples for the dataLayer source now key on the prefix as
entity and the gtag action as action: `mapping.<prefix>.<action>`. The shipped
`examples/mapping.ts`, the comprehensive `flow-complete.json` example, and the
related docs reflect the convention, including the special-cased actions
`consent`, `config`, and `set` whose trailing token is dropped by the
entity/action split.
