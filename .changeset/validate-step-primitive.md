---
'@walkeros/core': minor
---

Add step-level `validate?` primitive on every walkerOS step. `validate:` is a
declarative description of validation intent, like `cache` or `consent`.
Consumers decide how to enforce.

Restructure `Flow.ContractRule` to a uniform
`{ extends?, tagging?, description?, events?, schema? }` shape. A single
agnostic JSON Schema replaces the typed section fields (`globals`, `context`,
`custom`, `user`, `consent`); standard event field names live inside
`schema.properties.<name>`. `extends` resolves `schema` via additive deep-merge.

Contracts are a description and governance concept: tooling, MCP, and humans
read them. Runtime enforcement is the consumer's call.
