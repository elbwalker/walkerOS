---
'@walkeros/core': patch
---

Add missing fields to Zod schemas: require, logger, ingest on Source.Config and
require, logger on Destination.Config. These fields existed in TypeScript types
but were absent from schemas, making them undiscoverable via JSON Schema and
MCP.
