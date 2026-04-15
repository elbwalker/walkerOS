---
'@walkeros/collector': patch
---

Collector auto-generated destination keys now use lowercase letters only (a-z,
length 5) instead of base-36 (0-9a-z, length 4). `getId` gains an optional
charset parameter; default behavior is unchanged so session IDs and other
existing callers stay bit-for-bit identical.
