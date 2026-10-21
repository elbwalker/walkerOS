---
'@walkeros/server-core': patch
---

`sendServer` now throws a `StepError` instead of resolving `{ ok: false }`:
`transport` with the status and body, `timeout`, or `config` for an invalid URL.
It runs on the global `fetch`, and `GET` and `HEAD` requests send no body.
