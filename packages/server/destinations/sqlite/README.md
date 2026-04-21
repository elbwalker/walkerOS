# @walkeros/server-destination-sqlite

Server-side SQLite destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Writes events to a local
SQLite file (via `better-sqlite3`) or a remote Turso / libSQL / sqld database
(via `@libsql/client`). Driver is auto-selected from the connection URL. Both
SDKs are optional peer dependencies -- install only what you need.

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
        }
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
        }
      }
    }
  }
}
```

## Settings

| Setting            | Type                 | Required | Default  | Description                                                                                                                                    |
| ------------------ | -------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `sqlite.url`       | `string`             | Yes      | --       | Connection URL. `libsql://`, `http(s)://`, `ws(s)://` route to libSQL. Anything else is treated as a local file. Use `:memory:` for in-memory. |
| `sqlite.authToken` | `string`             | No       | --       | libSQL / Turso auth token. Ignored for local.                                                                                                  |
| `sqlite.table`     | `string`             | No       | `events` | Target table name.                                                                                                                             |
| `sqlite.schema`    | `'auto' \| 'manual'` | No       | `'auto'` | `auto` runs `CREATE TABLE IF NOT EXISTS` on init. `manual` skips creation (bring your own schema + mapping).                                   |

## Per-rule mapping overrides

| Setting                  | Type     | Description                          |
| ------------------------ | -------- | ------------------------------------ |
| `mapping.settings.table` | `string` | Override target table for this rule. |

## Auto Schema

With `schema: 'auto'` (the default), the first `init()` runs:

```sql
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  timestamp    INTEGER,
  event_id     TEXT,
  name         TEXT,
  entity       TEXT,
  action       TEXT,
  session_id   TEXT,
  user_id      TEXT,
  page_url     TEXT,
  page_title   TEXT,
  referrer_url TEXT,
  data         TEXT,
  globals      TEXT,
  consent      TEXT
)
```

Nested JSON fields (`data`, `globals`, `consent`) are stored as JSON strings.
`page_url` comes from `source.id`; `page_title` from `data.title`;
`referrer_url` from `source.previous_id`.

## Drivers

- **Local** (`better-sqlite3`): sync native driver, ideal for single-host
  deployments. URL is treated as a filesystem path. `:memory:` works too.
- **Remote** (`@libsql/client`): async HTTP/WSS driver for Turso, sqld, or
  self-hosted libSQL. Auth via `authToken`.

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
- `schema: 'manual'` skips `CREATE TABLE` but still uses the canonical column
  layout for the prepared INSERT. If your custom table has a different shape,
  also provide a mapping that produces matching args.

## Type Definitions

See [src/types/index.ts](./src/types/index.ts).

## License

MIT.
