---
"@walkeros/server-source-express": minor
"@walkeros/server-source-fetch": minor
"@walkeros/server-source-aws": minor
"@walkeros/server-source-gcp": minor
---

Accept non-JSON POST bodies in all server sources

Server sources no longer reject non-JSON bodies with HTTP 400. Instead, they push an empty event `{}` to the collector, enabling `source.before` transformers to process raw input via ingest. Raw body is available through ingest mapping (e.g., `"rawBody": "body"`).
