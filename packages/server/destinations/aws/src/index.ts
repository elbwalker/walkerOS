// AWS Firehose
export { destinationFirehose } from './firehose';
export * as DestinationFirehose from './firehose/types';

// AWS SNS
export { destinationSNS } from './sns';
export * as DestinationSNS from './sns/types';

// Default remains Firehose for backward compatibility.
export { destinationFirehose as default } from './firehose';
