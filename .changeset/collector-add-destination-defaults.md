---
'@walkeros/collector': patch
---

A destination added at runtime now keeps the defaults its code ships, such as a
default `batch`, just like a destination configured at startup. Values you pass
in the destination config still win over those defaults, and a `require` set in
the code's defaults now gates the destination as well.
