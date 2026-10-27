---
'@walkeros/core': patch
---

A destination package can publish `examples.minimal` from
`src/examples/minimal.ts` (`MINIMAL_EXAMPLE_FILE`): the settings it needs to
deliver, credentials named as secrets. `composeQuickstart` from
`@walkeros/core/dev` turns it into the install line, the integrated code and a
complete flow reading each credential as `$secret`, and throws when they cannot
be built. `packageMetaOf` writes a package's `$meta`, a single platform as a
list.
