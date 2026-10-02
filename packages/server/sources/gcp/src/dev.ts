import * as cloudFunctionExamplesNs from './cloudfunction/examples';
import * as pubsubPullExamplesNs from './pubsub/pull/examples';
import * as pubsubPushExamplesNs from './pubsub/push/examples';
import * as cloudFunctionSchemasNs from './cloudfunction/schemas';
import * as pubsubPullSchemasNs from './pubsub/pull/schemas';
import * as pubsubPushSchemasNs from './pubsub/push/schemas';

export * as schemas from './cloudfunction/schemas';
export * as examples from './cloudfunction/examples';
export * as pubsubPullSchemas from './pubsub/pull/schemas';
export * as pubsubPullExamples from './pubsub/pull/examples';
export * as pubsubPushSchemas from './pubsub/push/schemas';
export * as pubsubPushExamples from './pubsub/push/examples';

/** Dev examples per export, keyed by the export names in package.json. */
export const exportExamples = {
  sourceCloudFunction: cloudFunctionExamplesNs,
  sourcePubSubPull: pubsubPullExamplesNs,
  sourcePubSubPush: pubsubPushExamplesNs,
};

/** Schemas per export, keyed by the export names in package.json. */
export const exportSchemas = {
  sourceCloudFunction: { settings: cloudFunctionSchemasNs.settings },
  sourcePubSubPull: {
    settings: pubsubPullSchemasNs.settings,
    setup: pubsubPullSchemasNs.setup,
  },
  sourcePubSubPush: { settings: pubsubPushSchemasNs.settings },
};
