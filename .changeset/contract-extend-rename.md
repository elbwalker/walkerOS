---
'@walkeros/core': patch
'@walkeros/cli': patch
---

Rename the contract inheritance key from `extends` to `extend` for consistency
with the rest of the flow config vocabulary. Contracts that inherit from another
named contract now use `"extend": "<name>"`.
