---
'@walkeros/core': patch
---

The source config descriptions of `require`, `setup` and `ingest` now match the
behaviour: `require` delays only `on()` calls, not init or event capture;
`setup` runs only through `walkeros setup`; `ingest` resolves against the
normalized request scope of server sources.
