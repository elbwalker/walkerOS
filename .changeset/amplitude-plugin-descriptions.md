---
'@walkeros/web-destination-amplitude': patch
---

The `sessionReplay`, `experiment` and `engagement` descriptions now say that
`@amplitude/unified` sets up all three plugins on every init and that these
settings only pass options to them, and how Session Replay sampling is decided.
The step examples name the destination config they rely on, and the login
example uses a millisecond timestamp.
