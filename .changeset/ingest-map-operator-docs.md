---
'@walkeros/core': patch
'@walkeros/transformer-ga4': patch
'@walkeros/server-transformer-bot': patch
'@walkeros/server-transformer-fingerprint': patch
'@walkeros/cli': patch
---

Documentation fix: server source `config.ingest` examples now use the `map`
operator with direct request field paths instead of a bare object. A bare object
like `{ url: 'req.url' }` is silently inert, so the ingest stayed empty and
downstream `ingest.*` fields never resolved. Affects package hints, READMEs, the
core source type docs, and the bundled CLI example.
