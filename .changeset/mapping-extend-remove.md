---
'@walkeros/core': patch
'@walkeros/transformer-ga4': patch
---

Add `extend` and `remove` to mapping rules. `extend` deep-merges a partial rule
onto a package-shipped default (a `null` value clears an inherited field);
`remove` strips fields from the produced payload. Rules without either keyword
keep the existing replace behavior.
