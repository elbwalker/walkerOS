import * as bigqueryExamplesNs from './bigquery/examples';
import * as pubsubExamplesNs from './pubsub/examples';
import * as bigquerySchemasNs from './bigquery/schemas';
import * as pubsubSchemasNs from './pubsub/schemas';

export * as schemas from './schemas';
export * as examples from './bigquery/examples';
export * as pubsubExamples from './pubsub/examples';
export { hints } from './hints';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  destinationBigQuery: bigqueryExamplesNs,
  destinationPubSub: pubsubExamplesNs,
};

/** Schemas per export, keyed by the export names in package.json. */
export const exportSchemas = {
  destinationBigQuery: {
    settings: bigquerySchemasNs.settings,
    mapping: bigquerySchemasNs.mapping,
  },
  destinationPubSub: {
    settings: pubsubSchemasNs.settings,
    mapping: pubsubSchemasNs.mapping,
    setup: pubsubSchemasNs.setup,
  },
};
