export * as schemas from './cloudfunction/schemas';
export * as examples from './cloudfunction/examples';
export * as pubsubPullSchemas from './pubsub/pull/schemas';
export * as pubsubPullExamples from './pubsub/pull/examples';
export * as pubsubPushSchemas from './pubsub/push/schemas';
export * as pubsubPushExamples from './pubsub/push/examples';

import * as cloudFunctionExamplesNs from './cloudfunction/examples';
import * as pubsubPullExamplesNs from './pubsub/pull/examples';
import * as pubsubPushExamplesNs from './pubsub/push/examples';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  sourceCloudFunction: cloudFunctionExamplesNs,
  sourcePubSubPull: pubsubPullExamplesNs,
  sourcePubSubPush: pubsubPushExamplesNs,
};
