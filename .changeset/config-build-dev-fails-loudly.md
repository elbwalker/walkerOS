---
'@walkeros/config': patch
---

`buildDev` fails the build with a message naming the package when it cannot
generate `walkerOS.json`: a missing or broken `dist/dev.mjs`, no schemas, or
output that is not valid JSON. It used to warn and skip the file.
`toSerializable` moved from `@walkeros/config/tsup` to `@walkeros/core/dev`.
