<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="256px"/>
  </a>
</p>

# BigQuery destination for walkerOS

Why You Need this: Streamline your data collection and analysis by directly
sending events from walkerOS to Google BigQuery. This destination package makes
it easy to integrate your data pipeline with one of the most powerful data
warehouses available.

## Usage

The BigQuery destination allows you to send server-side events from walkerOS to
Google BigQuery. It handles the data transformation and ensures that your events
are correctly formatted for BigQuery tables.

For more details, refer to the following documentation sections:

[Setup]() (required to create the table) [Configuration]() [Data Mapping]()

## Basic example

Here's a simple example to demonstrate how to configure the BigQuery
destination:

```ts
import { destinationBigQuery } from '@elbwalker/destination-node-bigquery';

elb('walker destination', destinationBigQuery, {
  custom: {
    projectId: 'PR0J3CT1D', // Required
    // client: BigQuery; // A BigQuery instance from @google-cloud/bigquery
    // location: string; // 'EU' as default
    // datasetId: string; // 'walkeros' as default
    // tableId: string; // 'events' as default
    // bigquery?: BigQueryOptions; // BigQueryOptions from @google-cloud/bigquery
  },
});
```

Learn more how to
[authenticate with a service account key file](https://cloud.google.com/bigquery/docs/authentication/service-account-file)
using the custom `bigquery` options.

```ts
{
  custom: {
    projectId: 'PR0J3CT1D', // Required
    bigquery: {

    }
  }
}
```

Take a look at the events [table schema](./src/schema.ts).

## Who this package is for

This destination is ideal for data engineers and analysts who are already using
Google BigQuery or plan to integrate it into their data stack. It's also useful
for companies looking to centralize their data collection and analysis efforts.

## Dependencies

Before using the BigQuery destination, ensure you have:

- Google Cloud Platform account
- walkerOS Node client installed
- Permissions to write to BigQuery (TBD XXX)
- Run the setup function to create the table
