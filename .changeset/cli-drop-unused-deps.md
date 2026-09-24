---
'@walkeros/cli': minor
---

`@walkeros/cli` no longer depends on `express`, `cors` or `p-limit`. Nothing in
the CLI imported them, so an install is smaller and pulls fewer transitive
packages into your project.
