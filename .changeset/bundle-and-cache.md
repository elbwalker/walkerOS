---
'@walkeros/cli': patch
---

Server builds served from the build cache now copy the root `include` folders;
web builds ignore `include` and log it. An unused package in `bundle.packages`
warns instead of failing the build. Cache entries are written atomically, so an
interrupt no longer leaves a broken entry, and `walkeros cache clear` removes
leftovers. Temp dirs are `<tmp>/walkeros/<kind>/<id>`.
