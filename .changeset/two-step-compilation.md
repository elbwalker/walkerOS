---
'@walkeros/cli': minor
---

Refactor bundler to two-step compilation: ESM code compilation + platform
wrapper. Config changes no longer require full rebuilds. Production bundles
carry zero dev/simulate code.
