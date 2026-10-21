---
'@walkeros/server-destination-file': patch
---

Each push waits until its line is written; a failed open or write fails the push
instead of a warning, and a stream error no longer crashes the process. A
dynamic filename that resolves to nothing fails with `missing-input`. Rules with
`silent: true` write nothing.
