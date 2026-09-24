export * as schemas from './schemas';
export * as examples from './examples';

import * as firehoseExamplesNs from './firehose/examples';
import * as snsExamplesNs from './sns/examples';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  destinationFirehose: firehoseExamplesNs,
  destinationSNS: snsExamplesNs,
};
