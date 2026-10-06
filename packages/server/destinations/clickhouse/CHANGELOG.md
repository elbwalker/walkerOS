# @walkeros/server-destination-clickhouse

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
