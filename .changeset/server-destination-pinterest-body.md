---
'@walkeros/server-destination-pinterest': patch
---

An event that Pinterest reports as `failed` in its HTTP 200 answer now fails the
push instead of counting as delivered, with the dead-letter queue and one ERROR
line. Rules with `silent: true` send nothing.
