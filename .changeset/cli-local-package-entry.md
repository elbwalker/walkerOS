---
'@walkeros/cli': patch
---

A local package (`config.bundle.packages.<name>.path`) whose `main`, `module`,
`exports` or `bin` points outside `dist/` is copied whole (leaving out
`node_modules` and `.env` files at any depth, and `.turbo` and `.git` at the
top; type declarations and `.json` exports do not count), so a package with its
Node entry in `lib/` loads. A declared package whose installed copy has none of
its entries is now named as such ("its installed copy has no <entry>") and no
longer reported as unused.
