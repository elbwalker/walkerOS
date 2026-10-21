---
'@walkeros/web-destination-piano': patch
---

Events no longer vanish while the Piano script loads: pushes wait for it, and
fail visibly when it is blocked or missing. A missing `site` or `collectDomain`
is a `config` error, and rules with `silent: true` send no event.
