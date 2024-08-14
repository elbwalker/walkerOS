<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# BigQuery destination for walkerOS

Why You Need this: Streamline your data collection and analysis by directly
sending walkerOS events to Google BigQuery. This destination makes it easy to
integrate your data pipeline with one of the most powerful data warehouses
available.

## Usage

The BigQuery destination allows you to send server-side walkerOS events to
Google BigQuery. It handles the data transformation and ensures that your events
are correctly formatted.

## Basic example

Follow the [setup steps](#setup) first.

Install the package

```sh
npm i @elbwalker/destination-node-bigquery
```

Add and configure the BigQuery destination:

```ts
import { destinationBigQuery } from '@elbwalker/destination-node-bigquery';

elb('walker destination', destinationBigQuery, {
  custom: {
    projectId: 'PR0J3CT1D', // Required
    // client: BigQuery; // A BigQuery instance from @google-cloud/bigquery
    // datasetId: string; // 'walkerOS' as default
    // tableId: string; // 'events' as default
    // location: string; // 'EU' as default
    // bigquery?: BigQueryOptions; // BigQueryOptions from @google-cloud/bigquery
  },
});
```

Learn more how to
[authenticate with a service account key file](https://cloud.google.com/bigquery/docs/authentication/service-account-file)
using the custom `bigquery` options.

## Setup

The destination requires an existing dataset and table to ingest data into.
Replace `PR0J3CT1D.walkerOS.events` with your actual project ID, dataset and
table names. Adjust the options if necessary, and run the query to create it.

```sql
CREATE TABLE `PR0J3CT1D.walkerOS.events` (
  timestamp TIMESTAMP NOT NULL,
  event STRING NOT NULL,
  data JSON,
  context JSON,
  custom JSON,
  globals JSON,
  user JSON,
  nested JSON,
  consent JSON,
  id STRING,
  trigger STRING,
  entity STRING,
  action STRING,
  timing NUMERIC,
  `group` STRING,
  count NUMERIC,
  version JSON,
  source JSON,
  createdAt TIMESTAMP NOT NULL
)
PARTITION BY DATE(timestamp)
OPTIONS (
  description="walkerOS raw events",
  partition_expiration_days=365, -- Automatically delete data older than 1 year
  require_partition_filter=true -- Enforce the use of partition filter in queries
);
```

> Note: If you also need to create a new dataset, consider to actively enable
> **physical storage billing model** to eventually reduce your BigQuery costs.
> Based on your events a compression factor of 6 is possible, but may result in
> higher querying costs.

## Permissions

When using Service Accounts (SAs) for Google Cloud BigQuery, it's recommended to
follow the principle of _least privilege_. Never grant more permissions than
what it needs to perform its intended functions.

Assign explicit permissions directly to datasets within BigQuery (using the
share option). This ensures that the service account only has access to what is
necessary for operation.

For more detailed information, refer to the official
[Google Cloud IAM documentation](https://cloud.google.com/iam/docs).

## Who this package is for

This destination is ideal for data engineers and analysts who are already using
Google BigQuery or plan to integrate it into their data stack. It's also useful
for companies looking to centralize their data collection and analysis efforts.

## Dependencies

Before using the BigQuery destination, ensure you have:

- walkerOS node client
- Google Cloud Platform account
- BigQuery dataset and table
- GCP service account with permissions to write to the events table
