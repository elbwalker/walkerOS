---
'@walkeros/cli': minor
---

A bundle's default release is now a content id of config, packages and CLI
version, so repeat builds hit the build cache. Env and secret values are not
part of it, only their names. `--release` now beats a flow's
`collector.release`. Rebuilt local `path` packages and CLI upgrades invalidate
the build caches, and `cache clear --builds` also clears compiled code.
