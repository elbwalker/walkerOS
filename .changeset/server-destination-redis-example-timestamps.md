---
'@walkeros/server-destination-redis': patch
---

The Redis step examples carry event timestamps in milliseconds, as the walkerOS
event model defines them, so the examples published in the docs and in MCP
`package_get` show realistic dates instead of days in January 1970.
