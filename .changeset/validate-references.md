---
'@walkeros/cli': minor
'@walkeros/core': minor
---

An unknown `$var` or `$store` now fails `walkeros validate`, as it fails the
bundle. References resolve per flow, and `description` text is never read as a
reference. A dangling contract `extend`, an unknown `$contract` on a validate
step, or a contract cycle is an error. Contracts bind only on validate steps.
Malformed references and unknown or shadowed routes warn.
