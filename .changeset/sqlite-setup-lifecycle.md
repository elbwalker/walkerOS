---
'@walkeros/server-destination-sqlite': patch
---

Add the `setup()` lifecycle. Run `walkeros setup destination.<name>` to create
the events table with the canonical walkerOS Event v4 schema and apply pragmas
(`journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`,
`temp_store=MEMORY`). Setup is idempotent and detects drift via
`PRAGMA table_info` (logs `WARN setup.drift`, never auto-mutates).

The `settings.sqlite.schema: 'auto' | 'manual'` setting is deprecated and will
be removed in the next major. Migration: `schema: 'auto'` to `setup: true`,
`schema: 'manual'` to `setup: false`. The deprecated form still works and emits
a one-time WARN through the destination logger.
