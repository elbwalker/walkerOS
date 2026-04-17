---
'@walkeros/server-destination-sqlite': minor
---

Add `@walkeros/server-destination-sqlite`: server destination that persists
walkerOS events to SQLite. One destination, two drivers behind a single
interface: `better-sqlite3` for local files and `:memory:`, `@libsql/client` for
remote Turso / libSQL / sqld. Driver is auto-selected from the connection URL.
Both SDKs are optional peer dependencies. Auto-creates a canonical events table
on init (opt-out via `schema: 'manual'`), caches a prepared INSERT, closes the
connection on `destroy()`. Per-rule `mapping.settings.table` override supported.
