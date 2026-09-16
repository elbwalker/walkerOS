---
'@walkeros/cli': patch
---

`walkeros validate --path` no longer fails with `unknown format "uri" ignored`
for packages whose settings use URL or email fields. Settings are still checked
for structure, types and patterns; string formats such as `uri` are not checked.
