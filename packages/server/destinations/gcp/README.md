<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# GCP (BigQuery) Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/gcp)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-gcp)

walkerOS follows a **source → collector → destination** architecture. This GCP
destination receives processed events from the walkerOS collector and streams
them to Google BigQuery, enabling real-time data warehousing and analytics with
Google Cloud's powerful data processing and machine learning capabilities.

## Installation

```sh
npm install @walkeros/server-destination-gcp
```

## Quick Start

Configure in your Flow JSON:

```json
{
  "version": 3,
  "flows": {
    "default": {
      "server": {},
      "destinations": {
        "bigquery": {
          "package": "@walkeros/server-destination-gcp",
          "config": {
            "settings": {
              "projectId": "YOUR_PROJECT_ID",
              "datasetId": "YOUR_DATASET_ID",
              "tableId": "YOUR_TABLE_ID"
            }
          }
        }
      }
    }
  }
}
```

Or programmatically:

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationBigQuery } from '@walkeros/server-destination-gcp';

const { elb } = await startFlow({
  destinations: [
    {
      destination: destinationBigQuery,
      config: {
        settings: {
          projectId: 'YOUR_PROJECT_ID',
          datasetId: 'YOUR_DATASET_ID',
          tableId: 'YOUR_TABLE_ID',
        },
      },
    },
  ],
});
```

## Configuration

| Name        | Type              | Description                                      | Required | Example                                    |
| ----------- | ----------------- | ------------------------------------------------ | -------- | ------------------------------------------ |
| `client`    | `BigQuery`        | Google Cloud BigQuery client instance            | Yes      | `new BigQuery({ projectId, keyFilename })` |
| `projectId` | `string`          | Google Cloud Project ID                          | Yes      | `'my-gcp-project'`                         |
| `datasetId` | `string`          | BigQuery dataset ID where events will be stored  | No       | `'walkerOS'` (default)                     |
| `tableId`   | `string`          | BigQuery table ID for event storage              | No       | `'events'` (default)                       |
| `location`  | `string`          | Geographic location for the BigQuery dataset     | No       | `'EU'` (default)                           |
| `bigquery`  | `BigQueryOptions` | Additional BigQuery client configuration options | No       | `{ keyFilename: "path/to/key.json" }`      |

## Setup (one-time provisioning)

```bash
walkeros setup destination.bigquery
```

Output: `setup: ok destination.bigquery` plus a JSON line with
`{ datasetCreated, tableCreated }`. Idempotent, safe to re-run.

IAM the operator service account needs:

- `bigquery.datasets.create`
- `bigquery.tables.create`
- `bigquery.datasets.get` (for drift detection)
- `bigquery.tables.get`

`config.setup`:

- `false` (default): no provisioning. Operator must run setup once explicitly.
- `true`: provision with defaults, `walkerOS` dataset, `events` table, `EU`
  location, `PHYSICAL` storage billing, day partitioning on `timestamp`,
  clustering on `(name, entity, action)`.
- `{ ...overrides }`: object form to override any default. See the `Setup`
  interface in `src/bigquery/types/index.ts`.

If an existing table's partitioning, clustering, or schema differs from the
declared configuration, setup logs `WARN setup.drift {...}` and continues. No
auto-mutation.

## Storage Write API (data plane)

The destination uses BigQuery's Storage Write API for data ingestion.

Note: the upstream `@google-cloud/bigquery-storage` package self-marks as
`EXPERIMENTAL` (subject to change). Pinned at `^5.1.0`.

## Batching

`pushBatch` is implemented. Set the collector's `batch: <ms>` mapping setting to
enable batching:

```jsonc
{
  "destinations": {
    "bigquery": {
      "package": "@walkeros/server-destination-gcp",
      "config": {
        "settings": { "projectId": "..." },
        "setup": true,
        "mapping": { "batch": 1000 },
      },
    },
  },
}
```

`batch: 1000` (1 second) is a reasonable default for analytics workloads. All
events buffered within the window flush as a single `appendRows` call.

## Table Schema

The default 15-column schema (walkerOS Event v4 canonical order):

| Column      | Type      | Mode     |
| ----------- | --------- | -------- |
| `name`      | STRING    | REQUIRED |
| `data`      | JSON      | NULLABLE |
| `context`   | JSON      | NULLABLE |
| `globals`   | JSON      | NULLABLE |
| `custom`    | JSON      | NULLABLE |
| `user`      | JSON      | NULLABLE |
| `nested`    | JSON      | NULLABLE |
| `consent`   | JSON      | NULLABLE |
| `id`        | STRING    | NULLABLE |
| `trigger`   | STRING    | NULLABLE |
| `entity`    | STRING    | NULLABLE |
| `action`    | STRING    | NULLABLE |
| `timestamp` | TIMESTAMP | NULLABLE |
| `timing`    | INT64     | NULLABLE |
| `source`    | JSON      | NULLABLE |

For custom schemas, override `config.setup.schema`. See the
[full documentation](https://www.walkeros.io/docs/destinations/server/gcp) for
custom mapping examples.

## Type Definitions

See [src/types/](./src/types/) for TypeScript interfaces.

## Related

- [Website Documentation](https://www.walkeros.io/docs/destinations/server/gcp/)
- [Destination Interface](../../../core/src/types/destination.ts)

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
