# @walkeros/server-store-sheets

Google Sheets store for walkerOS server flows.

Zero runtime dependencies, uses raw `fetch` against the Sheets v4 REST API with
built-in auth (ADC on Cloud Run / service account JWT elsewhere). Designed for
demos and small-scale prototyping where the spreadsheet IS the operator-facing
UI for tweaking lookup data.

## Caveats and quotas (read first)

The Sheets API is rate-limited and slow. Wiring this store directly into a
high-throughput pipeline will burn quota in seconds.

- **Quota:** 60 read requests / minute / user / project, 60 write requests /
  minute / user / project. Sheets, not BigQuery.
- **Latency:** 200 to 800 ms per HTTP round-trip.
- **No internal cache:** the package does NOT cache reads. Cache is the
  consumer's job, see "Wiring with the core cache" below.
- **Concurrency:** last writer wins on the same cell. There is no transactional
  `getAndSet`, two pipeline instances writing the same key WILL race.
- **Single-writer model:** if two pipeline instances both write to the same
  sheet, their `keyToRow` indexes diverge. Run with one writer.
- **Demo and small-prototype grade only.** Not a production CRM substitute.

## Quick Start (Bundled Mode)

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "crm": {
          "package": "@walkeros/server-store-sheets",
          "config": {
            "settings": {
              "id": "1AbCdEfGhIjKlMnOpQrStUvWxYz",
              "sheet": "Customers"
            }
          }
        }
      }
    }
  }
}
```

## Wiring with the core cache

To absorb the Sheets quota, wire the consuming transformer or destination with
the core `Cache` config, backed by a fast in-memory store:

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "crm": {
          "package": "@walkeros/server-store-sheets",
          "config": {
            "settings": {
              "id": "1AbCdEfGhIjKlMnOpQrStUvWxYz",
              "sheet": "Customers"
            }
          }
        },
        "lookupCache": {
          "package": "@walkeros/store-memory",
          "config": { "settings": {} }
        }
      },
      "transformers": {
        "enrich": {
          "package": "@walkeros/transformer-enrich",
          "env": {
            "store": "$store.crm",
            "cache": "$store.lookupCache"
          },
          "config": {
            "settings": {
              "cache": { "ttl": 60000 }
            }
          }
        }
      }
    }
  }
}
```

Use `ttl: 5000` for demos (fast iteration), `ttl: 60000` or higher for
production-ish loads. Without a cache, every event hits Sheets directly and
trips the 60 req/min quota in under one second.

## Integrated Mode

```typescript
import { storeSheetsInit } from '@walkeros/server-store-sheets';

const store = await storeSheetsInit({
  collector,
  logger,
  id: 'crm',
  config: {
    settings: {
      id: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
      sheet: 'Customers',
      // Omit credentials for ADC on Cloud Run / GKE,
      // or pass SA JSON: credentials: process.env.SHEETS_SA_KEY
    },
  },
  env: {},
});

const customer = await store.get('alice'); // unknown (parsed JSON) | undefined
await store.set('bob', { tier: 'silver' });
await store.delete('charlie');
```

Each value is JSON-stringified into one cell (the `value` column). Reads
JSON-parse the cell back. A non-parseable cell logs a debug line and returns
`undefined`.

## Configuration

| Setting       | Type               | Required | Default    | Description                                               |
| ------------- | ------------------ | -------- | ---------- | --------------------------------------------------------- |
| `id`          | `string`           | Yes      | (none)     | Spreadsheet ID, the segment between `/d/` and `/edit`     |
| `sheet`       | `string`           | No       | `'Sheet1'` | Sheet (tab) name within the spreadsheet                   |
| `key`         | `string`           | No       | `'A'`      | Column letter for keys (the lookup column)                |
| `value`       | `string`           | No       | `'B'`      | Column letter for values (JSON-serialized blob)           |
| `headerRows`  | `number`           | No       | `1`        | Number of header rows to skip when reading the key column |
| `credentials` | `string \| object` | No       | ADC        | Service account JSON or string. Omit on GCP for ADC       |

## Provisioning

The package ships an idempotent `setup()` lifecycle, invoked only by the
explicit operator command:

```bash
walkeros setup store.<id>
```

It never runs automatically. It verifies the spreadsheet exists and (if
configured) writes the `setup.headers` row.

### `Setup` options

| Option    | Type       | Default | Notes                                                                                          |
| --------- | ---------- | ------- | ---------------------------------------------------------------------------------------------- |
| `headers` | `string[]` | (none)  | Header values written to row 1 of the configured sheet. Idempotent overwrite, no drift detect. |

`id` is taken from `settings.id` and is NOT duplicated under `setup`.

### Behavior

- **Existence probe:** setup issues
  `GET /spreadsheets/<id>?fields=spreadsheetId` and throws an actionable error
  on 404.
- **Header write:** when `setup.headers` is provided, setup issues
  `PUT /values/<sheet>!A1:<lastCol>1?valueInputOption=RAW` with the headers as
  the row values. Re-running with the same headers is a no-op overwrite.
- **No `shareWith`:** Drive API integration is intentionally out of scope in
  this version (it requires a separate OAuth scope). Share the spreadsheet
  manually with the service account email before running setup.

### Runtime hard-fail

The first call to `init()` issues a single
`GET /spreadsheets/<id>?fields=spreadsheetId` per process per spreadsheet ID. On
404 it throws:

```
Spreadsheet not found: <id>. Run "walkeros setup store.<id>" to ensure the sheet exists and is shared with the service account.
```

Operators see the error pointing at the exact command to fix it. Subsequent
calls in the same process skip the check via an in-memory cache.

## Authentication

### Cloud Run / GKE (ADC)

When running on GCP infrastructure, omit `credentials`. The store fetches tokens
from the metadata server automatically. Required OAuth scope:
`https://www.googleapis.com/auth/spreadsheets`.

### Non-GCP (Service Account)

Pass a service account JSON as a string (from `$env.SHEETS_SA_KEY`) or as an
object with `client_email` and `private_key` fields. The store signs JWTs
locally and exchanges them for access tokens.

```json
{
  "credentials": "$env.SHEETS_SA_KEY"
}
```

The service account email needs Editor (or at least Viewer plus the explicit
`setup.headers` cells) access to the spreadsheet. Share the sheet with the
service account email before running setup.

## API

```typescript
const value = await store.get('alice'); // unknown | undefined
await store.set('bob', { tier: 'silver' }); // void
await store.delete('charlie'); // void
```

`get()` returns the JSON-parsed value, or `undefined` if the key is unknown, the
value cell is empty, or the cell is not valid JSON. `set()` for an unknown key
appends a new row, capturing the row index from the API response. `set()` for a
known key updates the existing value cell. `delete()` blanks the value cell, the
row stays in place to keep `keyToRow` indexes stable.

## Limitations

- **Single-cell value shape.** Multi-column structured rows are out of scope,
  ship a richer schema in a later phase if customers ask.
- **No drift detection on header content.** If an operator manually edits row 1,
  the next `walkeros setup store.<id>` overwrites it without warning.
- **No transactional updates.** `set` is two HTTP calls (read index, write
  cell). Concurrent writers can interleave.
