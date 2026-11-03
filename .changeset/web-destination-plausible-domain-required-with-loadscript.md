---
'@walkeros/web-destination-plausible': patch
---

With `loadScript: true`, a missing `settings.domain` now stops the destination
with a `config` error naming `domain`. Before, the script loaded without its
`data-domain`, every push counted as delivered, and Plausible dropped each event
because it could not attribute it to a site.
