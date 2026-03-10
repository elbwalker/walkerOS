---
'@walkeros/cli': patch
---

Fix $store: forward reference bug in bundler codegen — stores are now hoisted
into a separate variable declaration before the config object, ensuring store
references resolve correctly at runtime
