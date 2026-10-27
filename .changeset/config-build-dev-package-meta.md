---
'@walkeros/config': patch
---

`buildDev` writes the `$meta` of `walkerOS.json` with `packageMetaOf` from
`@walkeros/core/dev`, the same reading the conformance kit uses, so the two
cannot disagree. The output is unchanged; a `package.json` without a name or a
version now fails the build with a message instead of publishing a `$meta`
without them.
