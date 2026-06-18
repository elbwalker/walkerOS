---
'@walkeros/server-destination-gcp': patch
---

The BigQuery destination now applies `config.credentials` to the Storage Write
client that performs event writes, not just the query client. Event writes from
the configured service account now succeed on non-Google Cloud runtimes instead
of failing with a credentials error. Both clients resolve credentials the same
way, so a destination always authenticates as a single identity.
