---
'@walkeros/core': patch
---

Fix `resolveContracts` so a child contract that uses `extends` inherits the
parent's `tagging` when it does not redeclare it. Previously the parent's
`tagging` was silently dropped, which corrupted contract version tracking for
anyone building on a base contract.
