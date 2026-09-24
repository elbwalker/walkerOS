export * as schemas from './schemas';
export * as examples from './bigquery/examples';
export * as pubsubExamples from './pubsub/examples';
export { hints } from './hints';

import * as bigqueryExamplesNs from './bigquery/examples';
import * as pubsubExamplesNs from './pubsub/examples';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  destinationBigQuery: bigqueryExamplesNs,
  destinationPubSub: pubsubExamplesNs,
};
