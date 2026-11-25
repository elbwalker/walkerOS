# @walkeros/server-destination-clickhouse

## 4.10.0

### Patch Changes

- 61030f8: `credentials` takes a `{ token }` in place of
  `{ username, password }`, sent as `Authorization: Bearer`, for an endpoint
  that takes one, such as a proxy in front of ClickHouse. A token beside a
  username or password, an empty token and an `access_token` in the query of
  `settings.url` fail init with code `config`. The `@clickhouse/client` logger
  is off unless `settings.clickhouse.log` sets it, and a refusal of the walkerOS
  data proxy is quoted in the failure.

  Migration: a path in `settings.url` is now the path every insert is sent to.
  Before, the client read it as the database and it overrode
  `settings.database`. Name the database in `settings.database`.

- f1745d7: A paired runner now signs its writes to walkerOS hosted ingest with
  its own credential key, so a flow needs no ingest token: the usage report
  signs each report when it names no token, and the ClickHouse destination signs
  each insert when its settings set `signed: true`. Any other endpoint or
  ClickHouse keeps its token or credentials as before and is never signed for.
- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [4938120]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [527c632]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0
  - @walkeros/server-core@4.10.0

## 4.9.0

### Patch Changes

- 5313635: The package publishes a minimal example: the HTTP endpoint URL. The
  docs page renders the install line, the integrated code and the flow from it,
  and the package test runs the same settings.
- Updated dependencies [a67546d]
- Updated dependencies [1306d8a]
- Updated dependencies [34fd225]
- Updated dependencies [5313635]
- Updated dependencies [1306d8a]
- Updated dependencies [fa46337]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [34fd225]
- Updated dependencies [fa46337]
- Updated dependencies [1306d8a]
- Updated dependencies [5313635]
  - @walkeros/core@4.9.0
  - @walkeros/server-core@4.9.0

## 4.8.2

### Patch Changes

- 2374f54: A failed insert carries its ClickHouse code or network error and, for
  a missing table or too many parts, the fix in its message. The destination no
  longer logs a line of its own, and the server's text stays out of the message.
  Rules with `silent: true` insert nothing.
- Updated dependencies [2374f54]
- Updated dependencies [7e5fc27]
- Updated dependencies [2374f54]
- Updated dependencies [964590a]
- Updated dependencies [4100ede]
- Updated dependencies [2374f54]
- Updated dependencies [2374f54]
- Updated dependencies [15eb7b2]
- Updated dependencies [33a2779]
- Updated dependencies [33a2779]
- Updated dependencies [2374f54]
  - @walkeros/core@4.8.2
  - @walkeros/server-core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1
  - @walkeros/server-core@4.8.1

## 4.8.0

### Patch Changes

- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0
  - @walkeros/server-core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/server-core@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
  - @walkeros/core@4.7.1
  - @walkeros/server-core@4.7.1

## 4.7.0

### Minor Changes

- 27e68d0: New ClickHouse server destination. Events are written in bulk as
  JSONEachRow inserts into a table you create and own, with a bounded retry made
  safe by an insert deduplication token. A column your table is missing fails
  the batch loudly instead of dropping the field. The README carries the
  reference table DDL.

### Patch Changes

- 74821ed: Simulate records every vendor call through one recorder, `observeEnv`
  from `@walkeros/core`, and runs offline: BigQuery, Data Manager and the
  Sheets, GCS and S3 stores reach the network through `env`. Client and `Env`
  types of BigQuery, Firehose, PostHog, SQS and Pub/Sub are structural.
  `@walkeros/cli` exports `resolveExportName` and `selectDevExamples` and drops
  `findExample` and `compareOutput`.
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/core@4.7.0
  - @walkeros/server-core@4.7.0
