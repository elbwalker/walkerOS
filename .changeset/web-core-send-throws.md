---
'@walkeros/web-core': patch
---

`sendWeb` now throws a `StepError` instead of resolving `{ ok: false }`:
`transport` with the status for an error answer or a network error, `timeout`,
or `beacon-rejected`. A fetch skips `keepalive` past the browser's 64 KiB limit.
New `loadVendor` loads a vendor script once per page and reports
`vendor-not-loaded`, `vendor-not-ready` or `vendor-timeout`.
