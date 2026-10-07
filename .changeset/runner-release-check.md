---
'@walkeros/runner': patch
---

The runner refuses to start when the loaded flow does not match
`WALKEROS_FLOW_RELEASE` (and `WALKEROS_FLOW_NAME`, when set), so a container
never serves an artifact other than the one it was deployed with. Every start
logs the loaded flow's name and release.
