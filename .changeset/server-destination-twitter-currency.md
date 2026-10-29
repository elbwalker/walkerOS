---
'@walkeros/server-destination-twitter': patch
---

The X destination's rule setting `currency` now says it has no effect: X
receives no currency from this destination. The purchase step examples no longer
set it, and the `url` setting description says the custom URL must end in `/`.
Both show in the docs settings table and in MCP `package_get`.
