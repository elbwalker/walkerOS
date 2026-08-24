---
'@walkeros/server-transformer-bot': minor
---

`settings.context` now accepts any `Mapping.Value`, not just the enum literals,
and resolves it per request against `{ event, ingest }`, so one instance serves
every transport: `[{ "key": "ingest.transport" }, { "value": "beacon" }]` reads
the sender's annotation and pins `beacon` without it. The widening introduces no
silent-degradation path: a result outside the vocabulary falls back to `auto`
and reports `context_undetermined`, and a bare string that is neither a literal
nor a dot path is rejected by the schema.
