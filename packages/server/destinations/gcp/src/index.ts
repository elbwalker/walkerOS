// Google BigQuery
export { destinationBigQuery } from './bigquery';
export * as DestinationBigQuery from './bigquery/types';

// Google Pub/Sub
export { destinationPubSub } from './pubsub';
export * as DestinationPubSub from './pubsub/types';

export { destinationBigQuery as default } from './bigquery';
