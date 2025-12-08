<p align="left">
  <a href="https://www.walkeros.io">
    <img title="elbwalker" src="https://www.walkeros.io/img/elbwalker_logo.png" width="256px"/>
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

## Usage

Here's a basic example of how to use the GCP BigQuery destination:

```typescript
import { elb } from '@walkeros/collector';
import { destinationBigQuery } from '@walkeros/server-destination-gcp';

elb('walker destination', destinationBigQuery, {
  settings: {
    projectId: 'YOUR_PROJECT_ID',
    datasetId: 'YOUR_DATASET_ID',
    tableId: 'YOUR_TABLE_ID',
  },
});
```

## Configuration

| Name        | Type              | Description                                      | Required | Example                                    |
| ----------- | ----------------- | ------------------------------------------------ | -------- | ------------------------------------------ |
| `client`    | `BigQuery`        | Google Cloud BigQuery client instance            | Yes      | `new BigQuery({ projectId, keyFilename })` |
| `projectId` | `string`          | Google Cloud Project ID                          | Yes      | `'my-gcp-project'`                         |
| `datasetId` | `string`          | BigQuery dataset ID where events will be stored  | Yes      | `'walker_events'`                          |
| `tableId`   | `string`          | BigQuery table ID for event storage              | Yes      | `'events'`                                 |
| `location`  | `string`          | Geographic location for the BigQuery dataset     | No       | `'US'`                                     |
| `bigquery`  | `BigQueryOptions` | Additional BigQuery client configuration options | No       | `{ keyFilename: "path/to/key.json" }`      |

## Table Schema

By default, the destination sends the full walkerOS event. Create the table
with:

```sql
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT.walkeros.events` (
  timestamp TIMESTAMP,
  createdAt TIMESTAMP,
  name STRING,
  id STRING,
  entity STRING,
  action STRING,
  trigger STRING,
  `group` STRING,
  timing FLOAT64,
  count INT64,
  data STRING,
  context STRING,
  globals STRING,
  custom STRING,
  user STRING,
  nested STRING,
  consent STRING,
  version STRING,
  source STRING
);
```

Object and array fields (`data`, `context`, `globals`, etc.) are JSON
stringified. For custom schemas using the `data` mapping config, see the
[full documentation](https://www.walkeros.io/docs/destinations/server/gcp).

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
