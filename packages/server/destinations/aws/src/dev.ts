import * as firehoseExamplesNs from './firehose/examples';
import * as snsExamplesNs from './sns/examples';
import * as firehoseSchemasNs from './firehose/schemas';
import * as snsSchemasNs from './sns/schemas';

export * as schemas from './schemas';
export * as examples from './examples';
export { hints } from './hints';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  destinationFirehose: firehoseExamplesNs,
  destinationSNS: snsExamplesNs,
};

/** Schemas per export, keyed by the export names in package.json. */
export const exportSchemas = {
  destinationFirehose: {
    settings: firehoseSchemasNs.settings,
    mapping: firehoseSchemasNs.mapping,
  },
  destinationSNS: {
    settings: snsSchemasNs.settings,
    mapping: snsSchemasNs.mapping,
    setup: snsSchemasNs.setup,
  },
};
