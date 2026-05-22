---
'@walkeros/explorer': patch
---

Export the `$`-ref completion builders (`getVariableCompletions`,
`getEnvCompletions`, `getStoreCompletions`, `getFlowCompletions`,
`getSecretCompletions`) and the `CompletionEntry` type from the package barrel
so custom inputs can reuse them outside Monaco.
