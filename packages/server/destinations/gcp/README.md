<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# GCP (BigQuery, Pub/Sub) Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/gcp)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-gcp)

walkerOS follows a **source → collector → destination** architecture. This GCP
destination package ships two server-side sub-destinations:

- **BigQuery**, for streaming events into a managed data warehouse for analytics
  and machine learning workloads.
- **Pub/Sub**, for publishing events to a topic for downstream fan-out, async
  processing, or cross-region delivery.

One npm install covers both. Pick the export that matches your use case.

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

### Authentication

Both the control plane (setup, metadata) and the data plane (Storage Write API
ingestion) authenticate from `settings.bigquery`. To use a service account key
instead of ADC, pass it once:

`settings: { projectId, bigquery: { keyFilename: './sa.json' } }`

A pre-built `settings.client` authenticates only the control plane. For the data
plane to use non-ADC credentials, supply `settings.bigquery`.

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

## Pub/Sub

Publishes walkerOS events to a Google Cloud Pub/Sub topic. Supports per-key
ordering and dynamic attributes.

### Quick Start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "server": {},
      "destinations": {
        "pubsub": {
          "package": "@walkeros/server-destination-gcp",
          "code": "destinationPubSub",
          "config": {
            "settings": {
              "projectId": "YOUR_PROJECT_ID",
              "topic": "events"
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
import { destinationPubSub } from '@walkeros/server-destination-gcp';

const { elb } = await startFlow({
  destinations: [
    {
      destination: destinationPubSub,
      config: {
        settings: {
          projectId: 'YOUR_PROJECT_ID',
          topic: 'events',
        },
      },
    },
  ],
});
```

### Authentication

Three modes (same chain as BigQuery):

1. **Application Default Credentials (ADC)**: nothing to configure beyond
   `projectId`. Works on GCP-native runtimes (Cloud Run, GKE) and locally with
   `gcloud auth application-default login`.
2. **Service account JSON**: pass the credentials object (or a JSON string) via
   `settings.credentials`. The destination JSON-parses strings and forwards
   `client_email` + `private_key` to the SDK.
3. **Pre-configured client**: pass an existing `PubSub` instance as
   `settings.client`. Useful for shared connections across destinations.

When `settings.projectId` and `credentials.project_id` both resolve, the
top-level `settings.projectId` wins.

### Settings reference

| Name          | Type                            | Description                                             | Required |
| ------------- | ------------------------------- | ------------------------------------------------------- | -------- |
| `projectId`   | `string`                        | Google Cloud Project ID                                 | Yes      |
| `topic`       | `string`                        | Topic short name. SDK builds the full resource path.    | Yes      |
| `credentials` | `string \| ServiceAccountCreds` | Service account credentials, JSON string or object      | No       |
| `apiEndpoint` | `string`                        | Override Pub/Sub endpoint (use for the local emulator)  | No       |
| `orderingKey` | `Mapping.Value`                 | Default ordering-key mapping. Truthy enables ordering.  | No       |
| `attributes`  | `Mapping.Map`                   | Default per-event attributes merged into every publish  | No       |
| `client`      | `PubSub`                        | Pre-configured SDK instance, bypasses constructor build | No       |

### Mapping reference

Per-rule overrides under `mapping.<entity>.<action>.settings`:

| Name          | Type            | Description                                          |
| ------------- | --------------- | ---------------------------------------------------- |
| `topic`       | `string`        | Override the destination default topic for this rule |
| `orderingKey` | `Mapping.Value` | Per-rule ordering-key path, overrides settings       |
| `attributes`  | `Mapping.Map`   | Per-rule attributes merged on top of settings        |

### Ordering

`orderingKey` is a `Mapping.Value` resolved per event (for example `'user.id'`).
When the resolved key is truthy, the topic handle is built with
`messageOrdering: true` and the publish carries the resolved key. Pub/Sub
guarantees per-key ordering for messages published to the same region.

If a publish fails for an ordered key, Pub/Sub permanently halts subsequent
publishes on that key until `topic.resumePublishing(key)` is called. The
destination handles this automatically: on publish failure for an ordered key,
it calls `resumePublishing` immediately and re-throws so the operator sees the
error.

### Setup (one-time provisioning)

```bash
walkeros setup destination.<id>
```

Provisions the topic if it does not already exist. Idempotent, safe to re-run.
Defaults:

| Field                                            | Value                                       |
| ------------------------------------------------ | ------------------------------------------- |
| `messageStoragePolicy.allowedPersistenceRegions` | `['eu-west1', 'eu-west3', 'eu-west4']` (EU) |
| `messageRetentionDuration`                       | (unset, project default)                    |
| `kmsKeyName`                                     | (unset)                                     |
| `labels`                                         | (unset)                                     |

If your project has an org policy restricting regions, override
`messageStoragePolicy.allowedPersistenceRegions` accordingly.

IAM the operator service account needs:

- `pubsub.topics.create`
- `pubsub.topics.get` (for drift detection)
- `pubsub.topics.update` (only if you choose to mutate; the destination only
  warns on drift, never auto-mutates)

The runtime service account that publishes events needs `roles/pubsub.publisher`
on the topic.

If the existing topic's storage policy, retention, KMS key, or labels differ
from the declared configuration, setup logs `WARN setup.drift {...}` and
continues. Migrations are an operator decision.

Subscription provisioning is owned by the Pub/Sub source, not the destination.

### Emulator

The official Pub/Sub emulator runs locally for development:

```bash
gcloud beta emulators pubsub start --host-port=localhost:8085
export PUBSUB_EMULATOR_HOST=localhost:8085
```

The SDK automatically picks up `PUBSUB_EMULATOR_HOST`. To override explicitly,
set `settings.apiEndpoint`.

### Troubleshooting

- **NOT_FOUND on publish**: the topic does not exist. The destination logs
  `Pub/Sub topic "<topic>" not found in project "<projectId>". Run "walkeros setup destination.<id>" to create it.`
  Run setup once.
- **PERMISSION_DENIED / UNAUTHENTICATED**: the runtime service account lacks
  `roles/pubsub.publisher` on the topic, or ADC is not configured.
- **Ordering stuck**: a previous publish for an ordering key failed. The
  destination calls `resumePublishing` automatically on failure; if you observe
  sustained stalls, check publish-side error logs.

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
