---
'@walkeros/collector': patch
---

Fix store reference resolution: env values from `$store:` now correctly resolve
to initialized Store.Instance during transformer/destination push. Preserve
config.env across transformer init lifecycle.
