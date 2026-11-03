---
'@walkeros/transformer-ga4': patch
'@walkeros/transformer-validate': patch
'@walkeros/server-transformer-bot': patch
'@walkeros/server-transformer-fingerprint': patch
---

The GA4, bot and fingerprint hints now say that a `config.ingest` without the
`map` operator is rejected by `walkeros validate` and logged at runtime, and
that a missing fingerprint salt stops the flow. The GA4 `mapping` description
names the mapping features a GA4 rule does not run. The validate hints say the
step must be wired into a chain.
