---
'@walkeros/cli': patch
---

The deprecated telemetry bundle options that baked a plaintext ingest token into
wrapped browser bundles are removed; observation wiring now always uses the
bake-nothing `observe` connect config. `walkeros observe start` sends `level`
and `replace`, renders the activation URL, web credential, server env block,
expiry, and record count, and keeps the session warm while waiting.
