---
'@walkeros/core': minor
'@walkeros/collector': minor
'@walkeros/server-source-express': minor
'@walkeros/cli': minor
---

Add unified `env.respond` capability. Any step (transformer, destination) can
now customize HTTP responses via `env.respond({ body, status?, headers? })`.
Sources configure the response handler — Express source uses createRespond for
idempotent first-call-wins semantics. CLI serve mode removed (superseded by
response-capable flows).
