---
'@walkeros/cli': patch
---

A server build served from the build cache now copies the root `include` folders
too, like a fresh build. A manifest build of a web flow accepts `include` and
ignores it, as a local web build does; only a server flow's `include` is still
refused there as a local path.
