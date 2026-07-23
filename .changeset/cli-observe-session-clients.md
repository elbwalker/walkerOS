---
'@walkeros/cli': patch
---

The Observe session lifecycle is now available programmatically:
`startObserveSession`, `getObserveSession`, and the new `endObserveSession` are
exported from `@walkeros/cli`, so tools built on the CLI can open an Observe
session on a flow, read its status and record count, and end it. Starting one
also accepts `origins` to bind its web activation grant.
