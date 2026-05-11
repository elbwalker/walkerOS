---
'@walkeros/destination-demo': patch
---

Move from `packages/web/destinations/demo` to `packages/destinations/demo` so
the package can serve web and server flows from a single location, alongside
`packages/transformers/`. The published package name and exports are unchanged;
only the in-repo path moves. `walkerOS.platform` widens from `["web"]` to
`["web", "server"]`. No consumer code changes required.
