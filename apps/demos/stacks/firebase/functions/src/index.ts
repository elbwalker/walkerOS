import { destinationBigQuery } from '@elbwalker/destination-node-bigquery';
import { firebaseStack } from '@elbwalker/stack-firebase';
import { analystContract, scientistContract } from './contracts';
import { logDestination } from './destinations';

const { elb, push } = firebaseStack({
  client: {
    destinations: { logDestination }, // Static destinations
    contracts: [analystContract, scientistContract], // Enforce contracts
    onError: console.error, // Handle errors
  },
});

// Add destination dynamically
elb('walker destination', destinationBigQuery, {
  custom: {
    projectId: 'Y0UR_PR0J3CT1D',
    datasetId: 'walkerOS',
    tableId: 'events',
    location: 'EU',
    bigquery: {
      // bigquery is of the type BigQueryOptions
      // Use your own credentials or authenticate in other ways
      keyFilename: './credentials/service-account.json',
    },
  },
  verbose: true, // Enable logging
});

// The exported function name (ingest) is used as the endpoint name
export const ingest = push({ cors: true, region: 'europe-west1' });
