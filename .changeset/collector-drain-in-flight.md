---
'@walkeros/core': patch
'@walkeros/collector': patch
---

The shutdown waits for pushes in flight, and a push that arrives after it began
answers `ok: false` with the retryable reason `shutting-down`. Pushes still
running at the deadline make the command answer `ok: false` with the reason
`timeout`. Core gains the runner's release contracts. walker.js grows by 531
gzip bytes (41,545 to 42,076, gzip level 9) for this standard shutdown
behaviour.
