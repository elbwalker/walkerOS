export * as schemas from './schemas';
export * as examples from './lambda/examples';
export * as sqsExamples from './sqs/examples';

import * as lambdaExamplesNs from './lambda/examples';
import * as sqsExamplesNs from './sqs/examples';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  sourceLambda: lambdaExamplesNs,
  sourceSqs: sqsExamplesNs,
};
