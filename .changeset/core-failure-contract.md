---
'@walkeros/core': patch
---

`logger.throw` only throws and no longer writes a log line; the collector writes
the one failure line. A rule `condition` that throws fails the event instead of
falling through. A mapping value without an operator is dropped and reported.
The wildcard lookup tries exact, `entity *`, `* action`, then `* *`, and falls
through a tier whose conditions all fail.
