---
'@walkeros/cli': patch
---

The package and build caches are written to a temporary entry and renamed into
place once complete, so an interrupted write no longer leaves a broken entry; a
failed write warns and the build continues. Existing package entries download
once more. `walkeros cache clear` also removes interrupted writes. Temp dirs are
now `<tmp>/walkeros/<kind>/<id>`.
