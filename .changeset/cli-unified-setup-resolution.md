---
'@walkeros/cli': minor
---

`walkeros setup` now resolves a component's package the same way
`walkeros bundle` does: the flow's pinned version is downloaded from the
registry (sharing the bundle cache) and imported from there. Setup works via npx
without a local install; `path:` packages are supported for local development.
