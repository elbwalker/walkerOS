---
'@walkeros/cli': patch
---

Preview preflight now self-heals when a preview bundle is deleted. Instead of
injecting the preview script directly and letting it 404, the preflight does a
`fetch(HEAD)` first. If the bundle is missing, it clears the `elbPreview` cookie
and loads the production walker, so visitors never see silent analytics
breakage.
