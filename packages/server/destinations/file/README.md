# @walkeros/server-destination-file

Local file sink for walkerOS server flows. Appends events to a file in JSONL,
TSV, or CSV format. Useful for debug logging, audit trails, replay sources, and
lightweight local persistence without standing up a database.

## Install

```bash
npm install @walkeros/server-destination-file
```

## Usage

Add to your `flow.json`:

```json
{
  "destinations": {
    "log": {
      "package": "@walkeros/server-destination-file",
      "config": {
        "settings": {
          "filename": "events.jsonl"
        }
      }
    }
  }
}
```

Every event gets appended as a JSON line. The file and its parent directory are
created on flow startup.

## Settings

| Field      | Type                        | Default              | Notes                                                       |
| ---------- | --------------------------- | -------------------- | ----------------------------------------------------------- |
| `filename` | `string \| Mapping.Value`   | required             | Static path or per-event resolution via the mapping DSL.    |
| `format`   | `'jsonl' \| 'tsv' \| 'csv'` | `jsonl`              | Serialisation format.                                       |
| `fields`   | `string[]`                  | required for tsv/csv | Event paths used as columns. Object cells JSON-stringified. |

## Filename templating

`filename` accepts the standard walkerOS `Mapping.Value` shape.

### Tenant sharding

```json
{ "filename": { "key": "data.tenant" } }
```

### Daily rotation

```json
{
  "filename": {
    "fn": "$code:`events-${new Date(value.timestamp).toISOString().slice(0,10)}.jsonl`"
  }
}
```

Inside the `$code:` function, `value` is the event being processed.

## Formats

### JSONL (default)

One JSON object per line. Ingest with `jq`, `duckdb`, ClickHouse `JSONEachRow`,
BigQuery external tables, Athena.

### TSV / CSV

Specify `fields: string[]` listing the event paths to extract as columns. Object
values are JSON-stringified into a single cell. RFC 4180 quoting for CSV.

```json
{
  "filename": "events.csv",
  "format": "csv",
  "fields": ["timestamp", "name", "data"]
}
```

## Limits

- One file handle is opened per resolved filename and kept open until
  `destroy()`. Sharding by high-cardinality keys (e.g. `user.session`) can
  exhaust OS file descriptors.
- External rotation (e.g. `logrotate`) leaves the cached handle pointing at the
  rotated inode. Use the date-token pattern instead.
- No batching. Each event is `stream.write`'d individually.
- Write errors log a warning and drop the event — they never fail the flow.

## License

MIT
