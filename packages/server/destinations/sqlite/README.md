# @walkeros/server-destination-sqlite

Server-side SQLite destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Writes events to a local
SQLite file (via `better-sqlite3`) or a remote Turso / libSQL / sqld database
(via `@libsql/client`). Driver is auto-selected from the connection URL. Both
SDKs are optional peer dependencies, install only what you need.

## Installation

```bash
npm install @walkeros/server-destination-sqlite better-sqlite3
# or for remote Turso / libSQL
npm install @walkeros/server-destination-sqlite @libsql/client
```

## Quick Start

Local file:

```json
{
  "destinations": {
    "sqlite": {
      "package": "@walkeros/server-destination-sqlite",
      "config": {
        "settings": {
          "sqlite": {
            "url": "./events.db"
          }
        },
        "setup": true
      }
    }
  }
}
```

Remote Turso:

```json
{
  "destinations": {
    "sqlite": {
      "package": "@walkeros/server-destination-sqlite",
      "config": {
        "settings": {
          "sqlite": {
            "url": "libsql://my-db.turso.io",
            "authToken": "$env.TURSO_TOKEN"
          }
        },
        "setup": true
      }
    }
  }
}
```

## Settings

| Setting            | Type                 | Required       | Default  | Description                                                                                                                                    |
| ------------------ | -------------------- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `sqlite.url`       | `string`             | Yes            | `--`     | Connection URL. `libsql://`, `http(s)://`, `ws(s)://` route to libSQL. Anything else is treated as a local file. Use `:memory:` for in-memory. |
| `sqlite.authToken` | `string`             | No             | `--`     | libSQL / Turso auth token. Ignored for local.                                                                                                  |
| `sqlite.table`     | `string`             | No             | `events` | Target table name.                                                                                                                             |
| `sqlite.schema`    | `'auto' \| 'manual'` | **DEPRECATED** | `--`     | Use `config.setup` instead. `auto` maps to `setup: true`, `manual` maps to `setup: false`. Removed in next major.                              |

## Per-rule mapping overrides

| Setting                  | Type     | Description                          |
| ------------------------ | -------- | ------------------------------------ |
| `mapping.settings.table` | `string` | Override target table for this rule. |

## Setup

Create the events table and apply pragmas with one command:

```bash
walkeros setup destination.sqlite
```

This runs `CREATE TABLE IF NOT EXISTS` with the canonical 15-column walkerOS
Event v4 schema and applies four pragmas:

- `journal_mode = WAL` (better concurrent reads)
- `synchronous = NORMAL` (good durability vs. perf balance)
- `foreign_keys = ON`
- `temp_store = MEMORY`

Setup is idempotent. Re-running against a populated database is a safe no-op.
Drift between the declared schema and the actual table is logged as
`WARN setup.drift {field, declared, actual}`. Setup never auto-mutates an
existing table, no `ALTER TABLE`, no destructive recreates.

The default 15-column schema mirrors the canonical walkerOS Event v4 layout.
Only `name` is `NOT NULL`, every other column is nullable so partial events do
not block ingestion:

```sql
CREATE TABLE IF NOT EXISTS events (
  name      TEXT NOT NULL,
  data      TEXT,
  context   TEXT,
  globals   TEXT,
  custom    TEXT,
  user      TEXT,
  nested    TEXT,
  consent   TEXT,
  id        TEXT,
  trigger   TEXT,
  entity    TEXT,
  action    TEXT,
  timestamp TEXT,
  timing    INTEGER,
  source    TEXT
)
```

Override defaults in `config.setup`:

```json
{
  "destinations": {
    "sqlite": {
      "package": "@walkeros/server-destination-sqlite",
      "config": {
        "settings": { "sqlite": { "url": "./events.db" } },
        "setup": {
          "pragmas": { "journal_mode": "DELETE" },
          "indexes": [{ "name": "idx_events_name", "columns": ["name"] }]
        }
      }
    }
  }
}
```

`setup: true` accepts all defaults. `setup: false` (or omitted) means
`walkeros setup destination.sqlite` is a no-op for this destination.

### Migration from `schema`

The package-local `settings.sqlite.schema` setting is deprecated. The framework
now owns the setup lifecycle through `config.setup`. The deprecated form still
works and emits a one-time WARN through the destination logger.

| Old (`settings.sqlite.schema`) | New (`config.setup`) | Effect                                             |
| ------------------------------ | -------------------- | -------------------------------------------------- |
| `'auto'`                       | `true`               | `walkeros setup destination.sqlite` creates table. |
| `'manual'`                     | `false`              | Setup is a no-op. Bring your own schema + mapping. |
| omitted                        | omitted              | No-op until `setup` is set explicitly.             |

Remove the `schema` field from `settings.sqlite` and add `setup: true` (or
`false`) at the `config` level.

## Drivers

- **Local** (`better-sqlite3`): sync native driver, ideal for single-host
  deployments. URL is treated as a filesystem path. `:memory:` works too. All
  four default pragmas are honored.
- **Remote** (`@libsql/client`): async HTTP/WSS driver for Turso, sqld, or
  self-hosted libSQL. Auth via `authToken`. The remote server controls
  journaling, so client-side `journal_mode` is silently ignored. The other
  pragmas (`synchronous`, `foreign_keys`, `temp_store`) still apply.

Both are peer dependencies. The destination picks the driver at `init()` time
based on the URL prefix.

## Shutdown

The destination calls `close()` on the connection during `destroy()`.
User-provided clients (wired in via `env.client` or `settings.sqlite._client`)
are not closed.

## Limitations

- v1 issues one `INSERT` per event. A `pushBatch` path is planned for v2.
- Connection death is not auto-retried. A fatal driver error logs and drops
  events until the flow restarts.

## Type Definitions

See [src/types/index.ts](./src/types/index.ts).

## License

MIT.
